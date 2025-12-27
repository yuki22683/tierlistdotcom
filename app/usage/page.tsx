import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { BookOpen, Layers, Edit3, BarChart2, CheckCircle, MousePointer2, Image as ImageIcon, Type, Flag } from 'lucide-react'
import BackButton from '@/components/BackButton'
import HomeWrapper from '@/components/HomeWrapper'

export const metadata = {
  title: '使い方ガイド | ティアリスト.com',
  description: 'ティアリスト.comの概要、ティアリストの見方、作成方法についてのガイドです。',
}

export default async function UsagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <HomeWrapper uniqueKey="usage">
      <div className="flex items-center gap-4 mb-8 justify-center">
        <BackButton />
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">使い方ガイド</h1>
          <p className="text-muted-foreground">ティアリスト.comをもっと楽しむためのヒント</p>
        </div>
      </div>

      <div className="space-y-16">
        {/* セクション1: ティアリスト.comについて */}
        <section className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
              <BookOpen size={24} />
            </div>
            <h2 className="text-2xl font-bold">ティアリスト.comについて</h2>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">ティアリスト.com</strong>は、アニメ、ゲーム、食べ物、スポーツなど、あらゆるジャンルの「ティアリスト」を作成・共有・投票できるコミュニティプラットフォームです。
            </p>
            <p>
              一人で作った主観的なティアリストを公開するだけでなく、他のユーザーがそのティアリストに対して<strong className="text-foreground">投票</strong>を行うことで、みんなの意見が集約された<strong className="text-foreground">「総合評価」</strong>が自動的に生成されるのが最大の特徴です。
            </p>
          </div>
        </section>

        {/* セクション2: ティアリストの見方・投票 */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
              <Layers size={24} />
            </div>
            <h2 className="text-2xl font-bold">ティアリストの見方と参加方法</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-6">
              <div className="bg-card border p-6 rounded-xl">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <BarChart2 size={20} className="text-blue-500" />
                  ランク（階層）について
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  一般的に、上にある階層ほど評価が高いことを示します。
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2"><span className="font-bold w-8 text-center rounded" style={{ backgroundColor: '#ff7f7f', color: '#000000' }}>S</span> <span className="text-muted-foreground">最上位。神レベル。必須級。</span></li>
                  <li className="flex gap-2"><span className="font-bold w-8 text-center rounded" style={{ backgroundColor: '#ffbf7f', color: '#000000' }}>A</span> <span className="text-muted-foreground">非常に優秀。大好き。</span></li>
                  <li className="flex gap-2"><span className="font-bold w-8 text-center rounded" style={{ backgroundColor: '#ffdf7f', color: '#000000' }}>B</span> <span className="text-muted-foreground">普通。平均的。</span></li>
                  <li className="flex gap-2"><span className="font-bold w-8 text-center rounded" style={{ backgroundColor: '#ffff7f', color: '#000000' }}>C</span> <span className="text-muted-foreground">平均以下。微妙。</span></li>
                  <li className="flex gap-2"><span className="font-bold w-8 text-center rounded" style={{ backgroundColor: '#bfff7f', color: '#000000' }}>D</span> <span className="text-muted-foreground">最下位。苦手。</span></li>
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-card border p-6 rounded-xl">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <MousePointer2 size={20} className="text-purple-500" />
                  投票のやり方
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  ログインしていれば、誰でも公開されているティアリストに投票してランク付けに参加できます。
                </p>
                <ol className="space-y-3 text-sm text-muted-foreground list-decimal pl-4">
                  <li>ティアリストページの<strong>「投票」タブ</strong>を開きます。</li>
                  <li>アイテムをドラッグ＆ドロップして、あなたが思う適切なランクの行に配置します。</li>
                  <li>全ての配置が終わったら、下部の<strong>「投票」ボタン</strong>を押して完了です。</li>
                  <li>投票後、<strong>「結果」タブ</strong>でみんなの投票結果（平均ランク）を確認できます。</li>
                </ol>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-card border p-6 rounded-xl">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <CheckCircle size={20} className="text-green-500" />
                  クイズのやり方
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  投票結果を予想するクイズモードで遊べます。ログイン不要で誰でも楽しめます。
                </p>
                <ol className="space-y-3 text-sm text-muted-foreground list-decimal pl-4">
                  <li>ティアリストページの<strong>「クイズ」タブ</strong>を開きます。</li>
                  <li>シャッフルされたアイテムを、<strong>?マーク</strong>にドラッグ＆ドロップして配置します。</li>
                  <li>配置が終わったら<strong>「解答」ボタン</strong>を押すと、正解には赤い○、不正解には赤い×が表示されます。</li>
                  <li><strong>「答えを見る」ボタン</strong>で結果タブに移動して正解を確認できます。</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* セクション3: ティアリストの作成方法 */}
        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
              <Edit3 size={24} />
            </div>
            <h2 className="text-2xl font-bold">ティアリストの作成方法</h2>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-sm border border-border">
            <div className="mb-6">
              <p className="text-muted-foreground">
                自分だけのオリジナルテーマでティアリストを作成し、世界中に公開しましょう。作成にはログインが必要です。
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">1</div>
                <div>
                  <h3 className="text-lg font-bold mb-2">基本情報の入力</h3>
                  <p className="text-sm text-muted-foreground">
                    タイトル（例：「最強のアニメキャラ評価」）と説明文を入力します。タグを設定すると検索されやすくなります。
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">2</div>
                <div>
                  <h3 className="text-lg font-bold mb-2">アイテムの追加</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    ランク付けの対象となるアイテム（キャラクター、作品、商品など）を追加します。
                  </p>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800 px-3 py-2 rounded border">
                      <ImageIcon size={16} />
                      <span>画像アイテム</span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800 px-3 py-2 rounded border">
                      <Type size={16} />
                      <span>テキストアイテム</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">3</div>
                <div>
                  <h3 className="text-lg font-bold mb-2">階層（ティア）のカスタマイズ</h3>
                  <p className="text-sm text-muted-foreground">
                    ランクの名前（S, A, B...）や背景色を自由に変更できます。行を増やしたり減らしたりすることも可能です。
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">4</div>
                <div>
                  <h3 className="text-lg font-bold mb-2">設定と公開</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>「このティアリストへの投票を受け付ける」</strong>にチェックを入れると、他のユーザーが投票できるようになります。
                    チェックを外すと、あなたの決めた順位が固定された読み物として公開されます（クイズ機能などは利用可能です）。
                  </p>
                  <p className="text-sm text-muted-foreground">
                    最後に「保存」ボタンを押せば公開完了です！
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-10 text-center flex flex-col items-center gap-2">
              {user ? (
                <Link 
                  href="/tier-lists/new" 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 transition-colors"
                >
                  <CheckCircle size={20} />
                  さっそく作成する
                </Link>
              ) : (
                <button
                  disabled
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600/50 text-white font-bold rounded-full cursor-not-allowed"
                >
                  <CheckCircle size={20} />
                  さっそく作成する
                </button>
              )}
              {!user && (
                <p className="text-sm text-red-500 font-medium">
                  ログインが必要です
                </p>
              )}
            </div>
          </div>
        </section>

        {/* セクション4: 利用制限について */}
        <section className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-2xl border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
              <CheckCircle size={24} />
            </div>
            <h2 className="text-2xl font-bold">利用制限について</h2>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              快適なサービス提供のため、<strong className="text-foreground">ログインしたアカウントごと</strong>に以下の利用制限を設けています。
            </p>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border">
                <h3 className="font-bold text-lg text-blue-600 dark:text-blue-400 mb-2">ティアリスト作成</h3>
                <p className="text-2xl font-bold text-foreground">1日20件まで</p>
                <p className="text-sm mt-2">
                  1つのアカウントで1日（UTC基準）に作成できるティアリストの上限です。<strong className="text-foreground">ログインが必要</strong>です。
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg border">
                <h3 className="font-bold text-lg text-blue-600 dark:text-blue-400 mb-2">コメント投稿</h3>
                <p className="text-2xl font-bold text-foreground">1日20件まで</p>
                <p className="text-sm mt-2">
                  1つのアカウントで1日（UTC基準）に投稿できるコメントの上限です。<strong className="text-foreground">ログインが必要</strong>です。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* セクション5: 問題のある投稿を見つけたとき */}
        <section className="bg-red-50 dark:bg-red-900/10 p-8 rounded-2xl border border-red-100 dark:border-red-900/30">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
              <Flag size={24} />
            </div>
            <h2 className="text-2xl font-bold">問題のある投稿を見つけたとき</h2>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              ティアリスト.comでは、ユーザーの皆様に安心してご利用いただけるよう、利用規約に違反する投稿の監視を行っております。
            </p>
            <p>
              もし不適切なティアリストやコメントを見つけた場合は、各投稿にある<strong className="text-red-600 dark:text-red-400">「通報」ボタン（旗のアイコン）</strong>から運営へ報告することができます。報告いただいた内容は運営チームが確認し、必要に応じて削除や利用停止などの措置を検討いたします。
            </p>
          </div>
        </section>
      </div>
      </HomeWrapper>
    </div>
  )
}
