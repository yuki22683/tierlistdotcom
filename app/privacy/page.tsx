import Link from 'next/link'
import BackButton from '@/components/BackButton'

export const metadata = {
  title: 'プライバシーポリシー - ティアリスト.com',
  description: 'ティアリスト.comのプライバシーポリシーです。個人情報の取り扱いについて説明しています。',
}

export default function PrivacyPage() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-4xl">
      <BackButton />
      <h1 className="text-4xl font-bold mb-8">プライバシーポリシー</h1>

      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          最終更新日：{new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">1. はじめに</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            ティアリスト.com（以下「当サービス」）は、ユーザーの皆様の個人情報保護を重要視し、個人情報の保護に関する法律（個人情報保護法）を遵守します。
            本プライバシーポリシーは、当サービスがどのように個人情報を収集、使用、開示、保護するかを説明します。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">2. 収集する情報</h2>

          <h3 className="text-xl font-semibold mb-3 mt-6">2.1 ユーザー登録情報</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            当サービスはGoogleアカウントによるOAuth認証を使用しています。パスワードは当サービスで管理せず、Googleが管理します。
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
            <li>メールアドレス（Googleアカウントから取得）</li>
            <li>ユーザー名（表示名）</li>
            <li>プロフィール画像（Googleアカウントから取得、任意）</li>
            <li>Google ユーザーID（認証目的のみ）</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">2.2 ユーザー生成コンテンツ</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
            <li>ティアリストの内容（タイトル、説明、アイテム、画像など）</li>
            <li>投票データ</li>
            <li>コメント・返信</li>
            <li>いいね・よくないねの記録</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">2.3 自動的に収集される情報</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
            <li>IPアドレス</li>
            <li>ブラウザの種類とバージョン</li>
            <li>デバイス情報（OS、画面サイズなど）</li>
            <li>アクセス日時</li>
            <li>閲覧ページのURL</li>
            <li>リファラー情報</li>
            <li>Cookie情報</li>
          </ul>

          <h3 className="text-xl font-semibold mb-3 mt-6">2.4 利用状況データ</h3>
          <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
            <li>ティアリストの閲覧履歴</li>
            <li>最近見たティアリスト（Cookieに保存）</li>
            <li>検索履歴</li>
            <li>投票履歴</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">3. 情報の使用目的</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">収集した情報は、以下の目的で使用します：</p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
            <li>アカウントの作成・管理</li>
            <li>サービスの提供・運営</li>
            <li>ユーザー認証とセキュリティの確保</li>
            <li>ティアリストの作成・投票・コメント機能の提供</li>
            <li>カスタマーサポートの提供</li>
            <li>不正行為の防止・検出</li>
            <li>サービスの改善・新機能の開発</li>
            <li>統計データの作成・分析</li>
            <li>利用規約違反への対応</li>
            <li>法的義務の履行</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">4. Cookieの使用</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            当サービスでは、以下の目的でCookieを使用します：
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
            <li>ログイン状態の維持（認証Cookie）</li>
            <li>最近見たティアリストの記録</li>
            <li>ユーザー設定の保存</li>
            <li>サイトの利用状況の分析</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            ブラウザの設定でCookieを無効にすることもできますが、一部の機能が正常に動作しない場合があります。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">5. 第三者サービスの利用</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            当サービスは、以下の第三者サービスを利用しています：
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">5.1 Supabase</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            データベース、認証、ストレージサービスとしてSupabaseを使用しています。
            ユーザーデータは暗号化されて保存され、Supabaseのプライバシーポリシーに従って管理されます。
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">5.2 Amazon アソシエイト</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            当サービスはAmazon.co.jpを宣伝しリンクすることによってサイトが紹介料を獲得できる手段を提供することを目的に設定されたアフィリエイトプログラムである、
            Amazonアソシエイト・プログラムの参加者です。広告配信時にCookieが使用される場合があります。
          </p>

          <h3 className="text-xl font-semibold mb-3 mt-6">5.3 画像処理サービス</h3>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            クイズ画像の生成やスクリーンショット機能にPuppeteerを使用しています。
            これらの処理はサーバー内で完結し、外部に送信されることはありません。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">6. 情報の共有と開示</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            当サービスは、以下の場合を除き、ユーザーの個人情報を第三者に開示・共有しません：
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づく開示が必要な場合</li>
            <li>人の生命、身体または財産の保護のために必要がある場合</li>
            <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合</li>
            <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">7. 公開情報</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            以下の情報は、他のユーザーや一般公開される場合があります：
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
            <li>ユーザー名（表示名）</li>
            <li>プロフィール画像</li>
            <li>作成したティアリスト</li>
            <li>投稿したコメント</li>
            <li>公開投票データ（ティアリストごとの投票結果）</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            これらの情報は検索エンジンにインデックスされる可能性があります。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">8. データの保持期間</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            ユーザーデータは、アカウントが有効である限り保持されます。
            アカウント削除後は、法令で定められた期間を除き、合理的な期間内に削除されます。
          </p>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            ただし、バックアップデータや匿名化された統計データは、サービス改善のために保持される場合があります。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">9. セキュリティ</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            当サービスは、個人情報の漏洩、滅失、毀損を防止するため、適切な安全管理措置を講じています：
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
            <li>通信の暗号化（HTTPS/SSL）</li>
            <li>Google OAuth認証による安全なログイン</li>
            <li>Supabase AuthおよびRow Level Security（RLS）によるアクセス制御</li>
            <li>アクセスログの記録と監視</li>
            <li>定期的なセキュリティ監査</li>
            <li>不正アクセス防止のための技術的対策</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            ただし、インターネット上の完全なセキュリティを保証することはできません。
            ユーザーご自身でも、Googleアカウントの適切な管理など、セキュリティ対策を行ってください。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">10. 未成年者の個人情報</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            当サービスは、13歳未満のお子様からの個人情報を意図的に収集することはありません。
            13歳未満のお子様が当サービスを利用する場合は、保護者の同意が必要です。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">11. ユーザーの権利</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            ユーザーは、自身の個人情報について以下の権利を有します：
          </p>
          <ul className="list-disc pl-6 mb-4 text-gray-700 dark:text-gray-300">
            <li>アクセス権：自身の個人情報の開示を請求する権利</li>
            <li>訂正権：不正確な個人情報の訂正を請求する権利</li>
            <li>削除権：個人情報の削除を請求する権利（アカウント削除）</li>
            <li>利用停止権：個人情報の利用停止を請求する権利</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            これらの権利を行使したい場合は、お問い合わせフォームからご連絡ください。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">12. プライバシーポリシーの変更</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            当サービスは、必要に応じて本プライバシーポリシーを変更することがあります。
            重要な変更がある場合は、サービス内で通知します。
            変更後も当サービスを継続して利用することにより、変更に同意したものとみなされます。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">13. お問い合わせ</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            本プライバシーポリシーに関するご質問、ご意見、個人情報に関するお問い合わせは、
            <Link href="/contact" className="text-indigo-600 hover:underline ml-1">お問い合わせフォーム</Link>
            よりご連絡ください。
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">14. 準拠法と管轄裁判所</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            本プライバシーポリシーは日本法に準拠し、解釈されます。
            本プライバシーポリシーに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
          </p>
        </section>
      </div>
    </div>
  )
}
