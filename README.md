# 授業Q&A

授業や自習で出た疑問を投稿して、回答を共有するサイトです。Node.js と Express がリクエストを受け取り、Prisma が PostgreSQL を操作し、EJS が画面を表示します。

[公開サイト](https://class-qa-theta.vercel.app/)

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

## 機能ごとのファイル

画面のリンクやフォームを押すと、ブラウザーが URL にリクエストを送ります。[app.js](app.js) が Express のルーターを登録しています。どのリクエストを扱うかは、各ファイルの `router.get` または `router.post` で確認できます。

| 見たい機能 | サーバー側 | 対応する画面 |
| --- | --- | --- |
| 質問一覧、検索、絞り込み、並べ替え | [routes/question-list.js](routes/question-list.js) | [一覧](views/index.ejs) |
| カテゴリの追加 | [routes/categories.js](routes/categories.js) | [一覧のカテゴリ追加フォーム](views/index.ejs) |
| 質問の登録・編集・削除、解決状態の変更 | [routes/questions.js](routes/questions.js) | [質問フォーム](views/question-form.ejs)、[削除確認](views/question-delete.ejs) |
| スレッド詳細と返信リンク | [lib/question-thread.js](lib/question-thread.js) | [質問詳細](views/question.ejs)、[投稿の共通表示](views/post.ejs) |
| 回答の登録・削除 | [routes/answers.js](routes/answers.js) | [質問詳細の末尾](views/question.ejs) |

`views` では画面ごとにファイルを分けています。ヘッダー、フッター、質問と回答に共通する投稿表示は、それぞれ `header.ejs`、`footer.ejs`、`post.ejs` にあります。

画面を表示する操作は `GET`、データを変更する操作は `POST` で受け付けます。Prisma が使うテーブルの設計は [schema.prisma](prisma/schema.prisma) にあります。

## 解説動画で開くコード

登録、更新、削除の処理はすべて [routes/questions.js](routes/questions.js) にあります。たとえば質問の ID が `12` の場合、編集には `POST /questions/12/edit` が送られます。

### Create（登録）

1. [質問フォーム](views/question-form.ejs) で入力した値が `POST /questions` に送られます。`app.js` の `express.urlencoded()` が読み取るので、投稿者名は `req.body.author`、タイトルは `req.body.title` で取得できます。フォームの `name` と同じ名前です。
2. `readQuestionForm()` と `questionError()` で値を読み取り、必須項目、文字数、カテゴリを確認します。入力に問題があればフォームを再表示します。
3. `prisma.question.create({ data: … })` で保存します。保存結果の `savedQuestion.id` を使い、新しく作った質問の詳細へ移動します。

### Update（更新）

1. 編集フォームを送ると `POST /questions/12/edit` に届き、URL の `12` は `req.params.id` から取得できます。`readId()` で数値に変換します。
2. 変更後の値は `req.body` から受け取ります。`prisma.question.update({ where: { id }, data: question })` の `where` が対象を指定し、`data` が書き換える項目を指定します。編集したタイトル・本文・カテゴリが保存されます。

### Delete（削除）

1. 「質問を削除」を押すと `GET /questions/12/delete` で確認画面を表示します。「削除する」を押すと同じ URL に `POST` が送られます。
2. `prisma.question.delete({ where: { id } })` で URL が指す質問を削除します。[DBの設計](prisma/schema.prisma) にある `onDelete: Cascade` によって、その質問に紐づく回答も PostgreSQL が同時に削除します。

### カテゴリの追加

質問一覧で「カテゴリを追加」を開き、名前を入力すると `POST /categories` に送られます。`Category` テーブルに保存した項目は、質問の投稿・編集と一覧の検索フォームで選択できます。質問は `categoryId` でカテゴリとひもづきます。マイグレーションは従来の「授業」「課外活動」「その他」を登録し、既存の質問の分類も引き継ぎます。

### スレッドと回答

質問は `0001`、回答は投稿順に `0002`、`0003` と表示します。番号の横には、投稿フォームで入力した名前が表示されます。「返信」を押すと `?reply=0002` のように番号が URL に入り、同じスレッドにその番号があれば、回答フォームに `>>0002` が入ります。投稿本文を表示するときは、その番号を対応する投稿へのリンクにします。

回答を保存するときは、質問の `lastPostNumber` を1増やしてから、その番号で回答を作ります。`$transaction` でこの2つをまとめるため、同時に投稿しても番号が重なりません。削除された番号は再利用しません。回答フォームに不備がある場合は、入力値とエラーをスレッド上に表示します。

### 5分の録画の目安

1. GitHub でリポジトリを開き、公開サイトの質問フォームを見せます（約1分）。
2. 質問を投稿し、フォームの `name` → `req.body` → `create` を示します（約1分）。
3. 質問を編集し、URL → `req.params.id` → `where` と、変更内容が入る `data` を示します（約1分）。
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
