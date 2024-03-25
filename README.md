# SMTP to MongoDB

GitHub action to setup an smtp server that saves emails to mongo, uses mailparser's `ParsedMail` as document schema. Intended only for development and test workflows.

## Usage

Add the following to your workflow file to get smtp server running

```yaml
steps:
- uses: debdutdeb/smtp-to-mongodb-action@main
  with:
    log-file: /tmp/smtp.log
    mongo-url: mongodb://localhost:27017
```

You can use `supercharge/mongodb-github-action@1.10.0` with this action to get a mongo instance running.

Recommended structure is

```yaml
steps:
- uses: supercharge/mongodb-github-action@1.10.0
  with:
    mongodb-version: "5.0"

- uses: debdutdeb/smtp-to-mongodb-action@main
  with:
    log-file: /tmp/smtp.log
    mongo-url: mongodb://localhost:27017

# after using the server

- run: |
    cat /tmp/smtp.log
  if: failure()
```

Once SMTP server is running you can use the server with `smtp://localhost:2525`, with no auth and tls. 

By default emails are persisted on `tests` db, `emails_received` collection.

## Available options

| input           | description                | default         |
|-----------------|----------------------------|-----------------|
| port            | SMTP server port           | 2525            |
| mongo-url       | MongoDB connection URL     | nil             |
| log-file        | Where to save failure logs | nil             |
| database-name   | Database name in MongoDB   | tests           |
| collection-name | Collection in MongoDB      | emails_received |

If using TypeScript/JavaScript, you can use [this](./models/model.ts) file to access the emails.

Document type for each email is [ParsedMail](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/3a0f118ba93f54936d281608c0666e1104b67fc8/types/mailparser/index.d.ts#L171).
