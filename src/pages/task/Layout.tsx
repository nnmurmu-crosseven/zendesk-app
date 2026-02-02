import type { FC } from 'hono/jsx'

export const Layout: FC = ({ children }) => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Care Task Info</title>
      <link rel="stylesheet" href="/assets/app.css" />
    </head>
    <body>
      <div class="panel">
        <div class="scroll-content">{children}</div>
        <div class="footer">
          <button class="btn btn-draft" type="button">
            Draft Reply
          </button>
          <button class="btn btn-action" type="button">
            Forward ClickUp
          </button>
        </div>
      </div>
    </body>
  </html>
)
