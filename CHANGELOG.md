# 0.1.4

- Add `gatsby-plugin-root-import` to prevent the need to add ../../../../ to your templates and components

# 0.1.3

- Fix instances where an archive page as the home page will result in a path that contains `//`

# 0.1.2

- Move gatsby-plugin-sharp and transformer-sharp to peerDeps instead of deps
- Add sorting to page reporting so that snapshots are consistent

# 0.1.1

Fix Wapuu logo link

# 0.1.0

## New features

- Simplified how pages are created (no plugin options config needed except special cases)
- Updated docs to reflect latest changes
- Added ability to create templates by field value combinations like `Page title 'My Page'.js`

# 0.0.2

## New Features

- Add `addTemplateDirectory` hook so plugins and themes can register template directories
- Automatically create single and archive pages
- add template hierarchy. from least specific to most specific: index.js -> node interface (ContentNode.js) -> node type (Post.js)
- Add debugging messages to browser console during development

# 0.0.1

Initial commit of semi-working logic
