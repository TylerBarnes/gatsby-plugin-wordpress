// global-setup.js
import { spawn } from "child_process"
import path from "path"
// import on from "wait-on"

// require .env.development or .env.production
require(`dotenv`).config({
  path: path.resolve(process.cwd(), `.test-runtime/.env.test`),
})

require(`dotenv`).config({
  path: path.resolve(process.cwd(), `.test-runtime/.env.WORDPRESS_BASIC_AUTH`),
})

module.exports = async function globalSetup() {
  if (!process.env.START_SERVER) {
    return
  }

  console.log(`\nstarting Gatsby`)

  const gatsbyProcess = spawn(`yarn`, [`build-test-runtime`], {
    env: {
      ...process.env,
      NODE_ENV: `development`,
    },
  })

  global.__GATSBY_PROCESS = gatsbyProcess

  gatsbyProcess.stdout.pipe(process.stdout)

  await new Promise((resolve) => {
    gatsbyProcess.on(`exit`, () => resolve())
  })

  // await on({ resources: [`http://localhost:8000`] })
}
