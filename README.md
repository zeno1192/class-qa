# 授業Q&A

授業や自習で出た疑問を投稿して、回答を共有するサイトです。Node.js と Express がリクエストを受け取り、Prisma が PostgreSQL を操作し、EJS が画面を表示します。

## 手元で起動する

Node.js 22 と PostgreSQL を用意し、次を実行します。`class_qa` がすでにある場合は作成コマンドを省きます。`.env` の `YOUR_POSTGRES_USER` を PostgreSQL のユーザー名に置き換えます。パスワードが必要なら両方の接続先に設定します。

```sh
createdb class_qa
cp .env.example .env
npm ci
npm run db:deploy
npm start
```

ブラウザーで [http://localhost:3000](http://localhost:3000) を開きます。`npm run db:deploy` は `prisma/migrations/` の履歴からテーブルを作り、適用済みの変更を飛ばします。

## 解説動画で開くコード

[質問の処理](routes/questions.js) に Create、Update、Delete の順でコメントがあります。画面で操作しながら次の流れを自分の言葉で説明できます。

| 操作 | ブラウザーからサーバー | サーバーからデータベース |
| --- | --- | --- |
| Create | 質問フォームが `POST /questions` に送信する。`express.urlencoded()` が送信内容を読み取り、フォームの `name` に対応する値を `req.body` から取得する。 | 必須項目を確認し、`prisma.question.create({ data: … })` で保存する。保存後に新しい質問の ID を使って詳細へ移動する。 |
| Update | `POST /questions/:id/edit` の `req.params.id` が更新する質問を指す。変更後の値は `req.body` で受け取る。 | `where: { id }` で質問を選び、`prisma.question.update()` でタイトル、本文、カテゴリを書き換える。 |
| Delete | 削除画面で確認後、`POST /questions/:id/delete` を送る。`req.params.id` が削除対象になる。 | `prisma.question.delete({ where: { id } })` を実行する。[DBの設計](prisma/schema.prisma) の `onDelete: Cascade` により、その質問の回答も同時に消える。 |

一覧は `GET /` で表示します。検索条件は `req.query` で受け取り、Prisma の `where` に渡します。質問詳細では、質問とその質問に属する回答を関連付けて取得します。

### 5分の録画の目安

1. GitHub でリポジトリを開き、公開サイトで質問を投稿します（約1分）。
2. `question-form.ejs` の `name` と、`routes/questions.js` の `req.body`、`create` の対応を示します（約1分）。
3. 質問を編集し、URL の ID が `req.params.id` と `where: { id }` にどう渡るかを説明します（約1分）。
4. 回答を1件付けた質問を削除し、確認画面、`delete`、`onDelete: Cascade` の役割を示します（約2分）。

## テスト

テスト専用の PostgreSQL データベースにマイグレーションを適用してから実行します。

```sh
createdb class_qa_test
POSTGRES_PRISMA_URL=postgresql://YOUR_POSTGRES_USER@localhost:5432/class_qa_test \
POSTGRES_URL_NON_POOLING=postgresql://YOUR_POSTGRES_USER@localhost:5432/class_qa_test npm run db:deploy
TEST_DATABASE_URL=postgresql://YOUR_POSTGRES_USER@localhost:5432/class_qa_test npm test
```

## Vercelで公開する

GitHub のリポジトリを Vercel に取り込み、この課題専用の Neon データベースを接続します。Vercel の環境変数に `POSTGRES_PRISMA_URL`（通常の接続）と `POSTGRES_URL_NON_POOLING`（マイグレーション用）が入った状態でデプロイします。`vercel.json` のビルドコマンドがマイグレーションを適用します。

質問・回答の投稿、質問の編集・削除、回答の削除、解決状態の変更はログインなしで操作できます。公開サイトでは課題確認用のデータを使ってください。
