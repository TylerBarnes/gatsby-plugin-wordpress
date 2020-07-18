// global-teardown.js
// import kill from "tree-kill"
import fs from "fs-extra"

module.exports = async function globalTeardown() {
  if (!process.env.START_SERVER) {
    return
  }

  await fs.remove(`./.test-runtime/WordPress/reports`)

  // const gatsbyProcess = global.__GATSBY_PROCESS

  // kill(gatsbyProcess.pid)
  // console.log(`\nkilled Gatsby`)
}
