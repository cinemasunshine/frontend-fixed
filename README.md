# Features

# Usage

* set environment variables - For example,

```shell
set NODE_ENV=**********環境名**********
set NPM_TOKEN=**********npm motionpicture トークン**********
set SSKTS_API_ENDPOINT=**********mp apiのエンドポイント**********
set REDIS_HOST=**********REDISホスト**********
set REDIS_PORT=**********REDISポート**********
set REDIS_KEY=**********REDISキー**********
set GMO_CLIENT_MODULE=**********GMOCLIENTモージュールURL=**********
set GMO_ENDPOINT=**********gmo apiのエンドポイント**********
set COA_ENDPOINT=**********coa apiのエンドポイント**********
set COA_REFRESH_TOKEN=**********coa apiのリフレッシュトークン**********
set MVTK_RESERVE_ENDPOINT=**********ムビチケMvtkReserveService apiのエンドポイント**********
set PORTAL_SITE_URL=**********ポータルサイトURL**********
set CLIENT_ID=**********クライアントID**********
set CLIENT_SECRET=**********クライアント鍵**********
set AUTHORIZE_SERVER_DOMAIN=**********認証サーバードメイン**********
set RESOURCE_SERVER_URL=**********リソースサーバーURL**********
set ENTRANCE_SERVER_URL=**********エントランスサーバーURL**********
```

only on Aure WebApps

```shell
set WEBSITE_NODE_DEFAULT_VERSION=**********node.jsバージョン**********
set WEBSITE_TIME_ZONE=Tokyo Standard Time
```

クロスドメイン、iframeからのリクエスト許可

```shell
set WHITELIST=**********カンマつなぎのURLリスト**********
```

IP制限をかけたい場合

```shell
set SSKTS_ALLOWED_IPS=**********カンマつなぎのIPリスト**********
```

ベーシック認証をかけたい場合

```shell
set SSKTS_BASIC_AUTH_NAME=**********認証ユーザー名**********
set SSKTS_BASIC_AUTH_PASS=**********認証パスワード**********
```

メンテナンスページを表示させたい場合

```shell
set SSKTS_MAINTENANCE_TEXT=**********適当な文字列**********
```


# Build

ビルドは以下で実行できます。
- typescript
```shell
npm run build
```

- scss
```shell
npm run css
```

# Tests

単体テストは以下で実行できます。

```shell
npm test
```

<!-- UIテストは以下で実行できます。

```shell
npm ui-test
``` -->

# JsDoc

```shell
npm run jsdoc
```

`jsdocを作成できます。./docsに出力されます。
