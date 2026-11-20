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
| カテゴリの追加 | [lib/categories.js](lib/categories.js) | [質問フォームのカテゴリ選択](views/question-form.ejs) |
| 質問の登録・編集・削除、解決状態の変更 | [routes/questions.js](routes/questions.js) | [質問フォーム](views/question-form.ejs)、[削除確認](views/question-delete.ejs) |
| スレッド詳細と返信リンク | [lib/question-thread.js](lib/question-thread.js) | [質問詳細](views/question.ejs)、[投稿の共通表示](views/post.ejs) |
| 回答の登録・削除 | [routes/answers.js](routes/answers.js) | [質問詳細の末尾](views/question.ejs) |

`views` では画面ごとにファイルを分けています。ヘッダー、フッター、質問と回答に共通する投稿表示は、それぞれ `header.ejs`、`footer.ejs`、`post.ejs` にあります。

画面を表示する操作は `GET`、データを変更する操作は `POST` で受け付けます。Prisma が使うテーブルの設計は [schema.prisma](prisma/schema.prisma) にあります。

## 解説動画で開くコード

登録、更新、削除の処理は [routes/questions.js](routes/questions.js) にあります。録画では、ブラウザーで GitHub を開いて実際のコードを映し、操作・変数・データベースの変更を自分の言葉でつなげて説明します。

### Create（登録・7点）

1. [質問フォーム](views/question-form.ejs) が `POST /questions` に送信するところを示します。フォームの `name="title"`、`name="body"`、`name="author"`、`name="category"` が、サーバー側の `req.body` の項目名になります。[app.js](app.js) の `express.urlencoded()` がフォームの本文を読み取ります。
2. `readQuestionForm(req.body)` でタイトル、本文、カテゴリを取り出し、`author` には投稿者名を入れます。`questionError()` などで入力を検証し、問題があれば `400` と入力済みのフォームを返します。
3. `resolveCategoryId()` でカテゴリの ID を確定し、`db.question.create({ data: { title, body, author, categoryId } })` で PostgreSQL に質問を保存します。保存結果の `savedQuestion.id` を使って詳細ページへ移動します。

### Update（更新・7点）

1. 例として質問の ID が `12` なら、`GET /questions/12/edit` が `findUnique({ where: { id } })` で保存済みの質問を読み込み、初期値が入った編集フォームを表示します。送信すると `POST /questions/12/edit` に届きます。
2. URL の `12` は `req.params.id` から取り出し、`readId()` で数値にします。フォームの変更内容は `req.body` から受け取ります。
3. `db.question.update({ where: { id }, data: { title, body, categoryId } })` の `where` で更新する質問を、`data` で書き換える値を指定します。保存後に詳細ページを開き、変更が反映されたことを画面で示します。

### Delete（削除・6点）

1. 「質問を削除」を押すと `GET /questions/12/delete` で [確認画面](views/question-delete.ejs) を表示します。確認画面のボタンを押すと、同じ URL に `POST` が送られます。
2. URL から受け取った ID を `where: { id }` に入れ、`prisma.question.delete({ where: { id } })` で質問を削除します。
3. [DBの設計](prisma/schema.prisma) を開き、`Answer.questionId` が所属する質問を指すことと、`onDelete: Cascade` によって質問と一緒にその回答も PostgreSQL が削除することを説明します。

### カテゴリの追加

質問の投稿・編集フォームで「＋ カテゴリを追加」を選ぶと、新しいカテゴリ名の入力欄が表示されます。質問を保存する際に、[lib/categories.js](lib/categories.js) の `resolveCategoryId()` が既存カテゴリの ID を使うか、名前でカテゴリを作成・再利用するかを決めます。`$transaction` でまとめているので、質問の保存に失敗した場合は新規カテゴリも取り消されます。登録したカテゴリは一覧の検索でも選べます。

### スレッドと回答

質問は `0001`、回答は投稿順に `0002`、`0003` と表示します。番号の横には、投稿フォームで入力した名前が表示されます。「返信」を押すと `?reply=0002` のように番号が URL に入り、同じスレッドにその番号があれば、回答フォームに `>>0002` が入ります。投稿本文を表示するときは、その番号を対応する投稿へのリンクにします。

回答を保存するときは、質問の `lastPostNumber` を1増やしてから、その番号で回答を作ります。`$transaction` でこの2つをまとめるため、同時に投稿しても番号が重なりません。削除された番号は再利用しません。回答フォームに不備がある場合は、入力値とエラーをスレッド上に表示します。

### 5分の録画の目安

| 時間の目安 | 画面に映すものと説明すること |
| --- | --- |
| 0:00〜0:30 | 公開サイトと GitHub を開く。質問フォームの入力項目を見せる。 |
| 0:30〜1:50 | 質問を投稿する。フォームの `name` → `req.body` → 入力チェック → `db.question.create()` を示す。 |
| 1:50〜3:10 | 同じ質問を編集する。URL → `req.params.id` → `where` と、フォーム → `req.body` → `data` を示す。 |
| 3:10〜4:40 | 回答を1件付けた質問を削除する。確認画面の `GET` と削除の `POST`、`delete()` と `onDelete: Cascade` を示す。 |
| 4:40〜5:00 | 一覧に戻り、質問が消えたことを見せる。 |

課題の提出物は GitHub の URL、公開先 URL、約5分のソースコード解説動画の URL です。動画は自分の声で説明し、MP4 など通常の Mac 環境で再生できる形式にします。生成 AI の利用については、授業で指定されたガイドラインを確認してください。

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
