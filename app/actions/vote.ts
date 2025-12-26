'use server'

import { createClient } from '@/utils/supabase/server'
import { sendPushNotificationToUser } from '@/utils/pushNotifications'

interface VoteItem {
  item_id: string
  tier_id: string
}

/**
 * ティアリストに投票を送信
 *
 * @param tierListId - 投票対象のティアリストID
 * @param voteItems - 投票内容（アイテムとティアの紐付け）
 */
export async function submitVote(tierListId: string, voteItems: VoteItem[]) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }

  // 既存の投票をチェック
  const { data: existingVote } = await supabase
    .from('votes')
    .select('id')
    .eq('tier_list_id', tierListId)
    .eq('user_id', user.id)
    .maybeSingle()

  let voteId = existingVote?.id
  const isNewVote = !existingVote

  if (existingVote) {
    // 再投票の場合、既存の vote_items を削除
    await supabase.from('vote_items').delete().eq('vote_id', voteId)
  } else {
    // 新規投票の場合
    const { data: newVote, error: voteError } = await supabase
      .from('votes')
      .insert({ tier_list_id: tierListId, user_id: user.id })
      .select('id')
      .single()

    if (voteError || !newVote) {
      return { error: 'Failed to create vote' }
    }

    voteId = newVote.id

    // 投票数をインクリメント
    await supabase.rpc('increment_vote_count', { row_id: tierListId })
  }

  // vote_items を保存
  if (voteItems.length > 0) {
    const { error: insertError } = await supabase
      .from('vote_items')
      .insert(voteItems.map(item => ({ ...item, vote_id: voteId })))

    if (insertError) {
      return { error: 'Failed to save vote items' }
    }
  }

  // プッシュ通知を送信（新規投票のみ）
  if (isNewVote) {
    // 非同期で実行（投票処理をブロックしない）
    checkAndSendVoteMilestoneNotification(tierListId).catch(err => {
      console.error('Failed to send vote milestone notification:', err)
    })
  }

  return { success: true, voteId }
}

/**
 * 投票数の節目（10, 50, 100件）に達したら通知を送信
 *
 * @param tierListId - ティアリストID
 */
async function checkAndSendVoteMilestoneNotification(tierListId: string): Promise<void> {
  const supabase = await createClient()

  // ティアリスト情報と現在の投票数を取得
  const { data: tierList } = await supabase
    .from('tier_lists')
    .select('user_id, title, vote_count')
    .eq('id', tierListId)
    .single()

  if (!tierList) return

  const voteCount = tierList.vote_count || 0
  const milestones = [10, 50, 100, 500, 1000]

  // 節目に達したかチェック
  const reachedMilestone = milestones.find(m => voteCount === m)
  if (!reachedMilestone) return

  // 既に通知済みかチェック
  const notificationType = `vote_${reachedMilestone}`
  const { data: existingNotification } = await supabase
    .from('notification_history')
    .select('id')
    .eq('tier_list_id', tierListId)
    .eq('notification_type', notificationType)
    .maybeSingle()

  if (existingNotification) {
    console.log(`Milestone notification already sent: ${notificationType}`)
    return
  }

  // 通知を送信
  try {
    await sendPushNotificationToUser(tierList.user_id, {
      title: `🔥 投票が${reachedMilestone}件に達しました！`,
      body: `「${tierList.title}」が人気です`,
      data: {
        tierListId: tierListId,
        type: 'vote_milestone',
        milestone: reachedMilestone.toString()
      }
    })

    // 通知履歴を保存（重複防止）
    await supabase
      .from('notification_history')
      .insert({
        tier_list_id: tierListId,
        notification_type: notificationType
      })

    console.log(`✅ Sent vote milestone notification: ${reachedMilestone} votes`)
  } catch (error) {
    console.error('Failed to send or record vote milestone notification:', error)
    throw error
  }
}
