/* eslint strict: 0 */

const logStyles =
  "font-size: 15px; font-weight: bold; padding: 10px 20px; background: black; color: white;"

exports.wrapPageElement =
  process.env.NODE_ENV === `development`
    ? ({ element, props }) => {
        console.log(
          `%c🚀[gatsby-plugin-wordpress] The template used for this page is:\n${props.pageContext.component__DEVELOPMENT_ONLY}`,
          logStyles
        )
        console.log(
          "%c🚀[gatsby-plugin-wordpress] These are the page props for this path:",
          logStyles
        )
        console.log(props)
        return element
      }
    : false
