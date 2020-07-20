<div align="center" style="margin-bottom: 20px;">
<img src="docs/assets/gatsby-wapuus.png" alt="Wapuu hugging a ball with the Gatsby logo on it" />
</div>

<p align="center">
  <a href="https://github.com/TylerBarnes/gatsby-plugin-wordpress/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Gatsby and gatsby-plugin-wordpress are released under the MIT license." />
  </a>
  <a href="https://www.npmjs.org/package/gatsby-plugin-wordpress">
    <img src="https://img.shields.io/npm/v/gatsby-plugin-wordpress.svg" alt="Current npm package version." />
  </a>
  <a href="https://npmcharts.com/compare/gatsby-plugin-wordpress?minimal=true">
    <img src="https://img.shields.io/npm/dm/gatsby-plugin-wordpress.svg" alt="Downloads per month on npm." />
  </a>
  <a href="https://npmcharts.com/compare/gatsby-plugin-wordpress?minimal=true">
    <img src="https://img.shields.io/npm/dt/gatsby-plugin-wordpress.svg" alt="Total downloads on npm." />
  </a>
  <a href="https://gatsbyjs.org/contributing/how-to-contribute/">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome!" />
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=gatsbyjs">
    <img src="https://img.shields.io/twitter/follow/gatsbyjs.svg?label=Follow%20@gatsbyjs" alt="Follow @gatsbyjs" />
  </a>
</p>

# Gatsby Plugin WordPress

This plugin allows you to build WordPress sites with Gatsby in a standardized and streamlined way. It wraps around [gatsby-source-wordpress-experimental](https://github.com/gatsbyjs/gatsby-source-wordpress-experimental#readme) to source data. Like in regular WordPress, this plugin will generate pages for you automatically.

If you're brand new to Gatsby you'll want to go through the [GatsbyJS tutorial](https://www.gatsbyjs.org/tutorial/) first. If you're new to `gatsby-source-wordpress-experimental` you'll want to read through the ["Installation and Getting Started" page](https://github.com/gatsbyjs/gatsby-source-wordpress-experimental/blob/master/docs/getting-started.md#installation--getting-started-baby_chick) of the docs.

- [Gatsby Plugin WordPress](#gatsby-plugin-wordpress)
  - [How to use this plugin](#how-to-use-this-plugin)
  - [Automatic Page creation](#automatic-page-creation)
  - [Single Pages](#single-pages)
  - [Archive pages](#archive-pages)
  - [Single/Archive page combinations](#singlearchive-page-combinations)
  - [Page URL's](#page-urls)
  - [Template examples](#template-examples)
    - [Single Page template example](#single-page-template-example)
    - [Single Page with next and previous page links template example](#single-page-with-next-and-previous-page-links-template-example)
    - [Single Page Interface node type template example](#single-page-interface-node-type-template-example)
    - [Archive Page template example](#archive-page-template-example)
    - [Archive Page node interface template example](#archive-page-node-interface-template-example)
    - [Archive/Single Page combination node interface type template](#archivesingle-page-combination-node-interface-type-template)
  - [Plugin options](#plugin-options)
    - [General options](#general-options)
    - [Archive Page options](#archive-page-options)
    - [Reporting options](#reporting-options)
  - [Themeing](#themeing)
    - [Adding templates via themes](#adding-templates-via-themes)
    - [Creating a useful archive template fallback](#creating-a-useful-archive-template-fallback)
  - [Relevant Links](#relevant-links)

## How to use this plugin

The plugin options for this plugin are passed directly through to `gatsby-source-wordpress-experimental`. Any options for this plugin should be mixed in with the options for the source plugin. You should install this plugin _instead of_ the source plugin, not alongside it. Configure this plugin as if it is the source plugin. Refer to the [source plugins docs](https://github.com/gatsbyjs/gatsby-source-wordpress-experimental) for more info on available [plugin options](https://github.com/gatsbyjs/gatsby-source-wordpress-experimental/blob/master/docs/getting-started.md) or how to [get started](https://github.com/gatsbyjs/gatsby-source-wordpress-experimental/blob/master/docs/getting-started.md#installation--getting-started-baby_chick).

## Automatic Page creation

Out of the box this plugin will generate 2 types of pages for you, single pages and archive pages. Single pages are pages which represent a single node of any type (Post, Page, User, etc). Archive pages are historical list pages of nodes that were created in the past, the classic example being a blog post listing page.

## Single Pages

Single pages are automatically created using a simplified template hierarchy. This hierarchy is made up of all available templates in your project within the `src/wp-templates/single/` directory, or from within any themes you've installed.

The hierarchy goes from least specific templates to most specific templates, like so:

- Node interface type templates (`src/wp-templates/single/NodeInterfaceType.js`)
- Node type templates (`src/wp-templates/single/NodeType.js`)
- Node field-value templates (`src/wp-templates/single/NodeType title 'My post title'.js`)

Using the Post node type as an example, that would look like this:

- `src/wp-templates/single/ContentNode.js`
- `src/wp-templates/single/Post.js`
- `src/wp-templates/single/Post databaseId 1024.js`

If your project contained all 3 of these templates, all Posts would use the `Post.js` template except for the Post with a databaseId of 1024. If the `Post.js` template was removed, all posts would use the `ContentNode.js` template except for the Post with the db id of 1024.

To understand the reason for this, you first need to understand that a node interface is a node type which is made up of multiple other node types which share some fields but have other fields which are unique to each other. In our case `ContentNode` is made up of `Post`, `Page`, and any other Custom Post Type node type (maybe `Team` or `OfficeLocation`). Having a hierarchy which includes node interface types allows us to share templates between different types of nodes. So we can have 1 template which includes both Post and Page.

So going back to our example above, if we have these 3 templates

- `src/wp-templates/single/ContentNode.js`
- `src/wp-templates/single/Post.js`
- `src/wp-templates/single/Post databaseId 1024.js`

All Page nodes will use `ContentNode.js`, all Post nodes will use `Post.js` and the Post with a databaseId of 1024 will use the field-value template `Post databaseId 1024.js`.

- [Skip to single/Post.js example](#single-page-template-example)
- [Skip to single/ContentNode.js example](#single-page-interface-node-type-template-example)

## Archive pages

Archive pages are automatically created using a simplified template hierarchy. This hierarchy is made up of all available templates in your project within the `src/wp-templates/archive/` directory, or from within any themes you've installed.

The hierarchy goes from least specific templates to most specific templates, like so:

- Node interface type templates (`src/wp-templates/archive/NodeInterfaceType.js`)
- Node type templates (`src/wp-templates/archive/NodeType.js`)

This is very similar to our hierarchy for single pages, but is 1 step shorter. The same rules for node interface types apply here, so read the [single pages](#single-pages) section for more information.

- [Skip to Archive page example](#archive-page-template-example)
- [Skip to Archive node interface example](#archive-page-node-interface-template-example)

## Single/Archive page combinations

If a single page is created at the same path as an archive page, the single page and the archive page will be combined into 1 template and they will use the archive template.

- [Skip to Single/Archive page example](#singlearchive-page-combinations)

## Page URL's

All created pages are built using the WordPress permalink for each page or the archive slug or rewrite. It's important to use these paths instead of coming up with something custom on the Gatsby side so that menus and custom field links work properly in Gatsby.

## Template examples

### Single Page template example

In `src/wp-templates/single/Post.js`

```js
import React from "react"
import { graphql } from "gatsby"

export default ({ data }) => <h1>{data.wpPost.title}</h1>

export const query = graphql`
  query Post($id: String!) {
    wpPost(id: { eq: $id }) {
      title
    }
  }
`
```

### Single Page with next and previous page links template example

In `src/wp-templates/single/Post.js`

```js
import React from "react"
import { graphql } from "gatsby"
import BlogPost from "../../components/template-parts/blog-post"

export default ({ data }) => (
  <>
    <h1>{data.wpPost.title}</h1>
    <Link to={data.nextPost.uri}>Next Post</Link>
    <Link to={data.previousPost.uri}>Previous Post</Link>
  </>
)

export const query = graphql`
  query PostWithNextAndPrevious(
    $id: String!
    $nextSinglePageId: String
    $previousSinglePageId: String
  ) {
    wpPost(id: { eq: $id }) {
      title
    }

    # here we're renaming wpPost to nextPost so it doesn't conflict
    nextPost: wpPost(id: { eq: $nextSinglePageId }) {
      uri
    }

    # and this one gets renamed to previousPost
    previousPost: wpPost(id: { eq: $previousSinglePageId }) {
      uri
    }
  }
`
```

### Single Page Interface node type template example

This template will apply to Page, Post, and any Custom Post types.

In `src/wp-templates/single/ContentNode.js`

```js
import React from "react"
import { graphql } from "gatsby"
import BlogPost from "../../components/template-parts/blog-post"

export default ({ data }) => <h1>{data.wpContentNode.title}</h1>

export const query = graphql`
  query ContentNode($id: String!) {
    wpContentNode(id: { eq: $id }) {
      ... on WpNodeWithTitle {
        title
      }
    }
  }
`
```

### Archive Page template example

In `src/wp-templates/archive/Post.js`

```js
import React from "react"
import { Link } from "gatsby"
import { graphql } from "gatsby"

export default ({ pageContext, data }) => (
  <>
    {data.allWpPost.nodes.map((node) => (
      <div key={`${node.uri}+${node.title}`}>
        <Link to={node.uri}>{node.title}</Link>
      </div>
    ))}
    {!pageContext.isFirst && pageContext.previousPagePath ? (
      <Link to={pageContext.previousPagePath}>previous</Link>
    ) : null}
    {!pageContext.isLast && pageContext.nextPagePath ? (
      <Link to={pageContext.nextPagePath}>next</Link>
    ) : null}
  </>
)

export const query = graphql`
  query PostArchive(
    $archiveNodeIds: [String]!
    $sortOrder: [SortOrderEnum]!
    $sortFields: [WpPostFieldsEnum]!
  ) {
    allWpPost(
      filter: { id: { in: $archiveNodeIds } }
      sort: { order: $sortOrder, fields: $sortFields }
    ) {
      nodes {
        uri
        title
      }
    }
  }
`
```

### Archive Page node interface template example

In `src/wp-templates/archive/ContentNode.js`

```js
import React from "react"
import { Link } from "gatsby"
import { graphql } from "gatsby"

export default ({ pageContext, data }) => (
  <>
    {data.allWpContentNode.nodes.map((node) => (
      <div key={`${node.uri}+${node.title}`}>
        <Link to={node.uri}>{node.title}</Link>
      </div>
    ))}
    {!pageContext.isFirst && pageContext.previousPagePath ? (
      <Link to={pageContext.previousPagePath}>previous</Link>
    ) : null}
    {!pageContext.isLast && pageContext.nextPagePath ? (
      <Link to={pageContext.nextPagePath}>next</Link>
    ) : null}
  </>
)

export const query = graphql`
  query ContentNodeArchive(
    $archiveNodeIds: [String]!
    $sortOrder: [SortOrderEnum]!
    $sortFields: [WpContentNodeFieldsEnum]!
  ) {
    allWpContentNode(
      filter: { id: { in: $archiveNodeIds } }
      sort: { order: $sortOrder, fields: $sortFields }
    ) {
      nodes {
        id
        uri
      }
    }
  }
`
```

### Archive/Single Page combination node interface type template

In `src/wp-templates/archive/ContentNode.js`

```js
import React from "react"
import { Link } from "gatsby"
import { graphql } from "gatsby"

export default ({ pageContext, data }) => (
  <>
    <h1>{data.wpContentNode.title}</h1>
    {data.allWpContentNode.nodes.map((node) => (
      <div key={`${node.uri}+${node.title}`}>
        <Link to={node.uri}>{node.title}</Link>
      </div>
    ))}
    {!pageContext.isFirst && pageContext.previousPagePath ? (
      <Link to={pageContext.previousPagePath}>previous</Link>
    ) : null}
    {!pageContext.isLast && pageContext.nextPagePath ? (
      <Link to={pageContext.nextPagePath}>next</Link>
    ) : null}
  </>
)

export const query = graphql`
  query ArchiveContentNodeWithSingleContentNode(
    $archiveNodeIds: [String]!
    $sortOrder: [SortOrderEnum]!
    $sortFields: [WpContentNodeFieldsEnum]!
    $id: String
  ) {
    wpContentNode(id: { eq: $id }) {
      ... on WpNodeWithTitle {
        title
      }
    }
    allWpContentNode(
      filter: { id: { in: $archiveNodeIds } }
      sort: { order: $sortOrder, fields: $sortFields }
    ) {
      nodes {
        id
        uri
      }
    }
  }
`
```

## Plugin options

### General options

If you want to disable a type from using the interface node step of the template hierarchy, you can do so on the type options for that type using the `useInterfaceTemplates` option. You can also disable archive or single page creation per type via plugin options if needed, but it's recommended to add or delete templates instead.

```js
{
    resolve: `gatsby-plugin-wordpress`,
    options: {
        type: {
            Post: {
                pages: {
                  useInterfaceTemplates: false // default is true
                  archive: false, // the default is true
                  single: true, // the default is true
                }
            }
            MediaItem: {
                pages: {
                  useInterfaceTemplates: true // default is false
                }
            }
        }
    }
}
```

### Archive Page options

You may want to change the number of nodes displayed per page for your archive page, or change the sort order or which field your archive is sorted by. You can do that via type options. Below is an example of all available archive options:

```js
{
    resolve: `gatsby-plugin-wordpress`,
    options: {
        type: {
            Post: {
                perPage: 5, // default is 10
                sortFields: `slug` // default is date
                sortOrder: `ASC`, // default is DESC
            }
        }
    }
}
```

Note that if you add sort fields which are not supported by your templates node type, your build will error. An example of this is trying to sort by title with a ContentNode archive template. ContentNode does not support sorting by title so you will have to sort by slug instead.

### Reporting options

If you'd like to have a report of which single and archive pages were created or rejected (due to various reasons), you can enable the following option:

```js
{
    resolve: `gatsby-plugin-wordpress`,
    options: {
        reports: {
          templateRouting: true,
        },
    }
}
```

That will print out 2 files on each build or data update. Each file will give you a list of created pages or for pages that couldn't be created, it will give you a reason (such as "Archive routing is disabled for this type in gatsby-config.js." or "No matching template exists.")

- `./WordPress/reports/archive-pages.json`
- `./WordPress/reports/single-pages.json`

## Themeing

### Adding templates via themes

If you would like to create a theme that registers templates for this plugin, doing so only requires a single step beyond the above steps.

In `gatsby-node.js` add the following:

```js
const { addTemplateDirectory } = require(`gatsby-plugin-wordpress`)

// this path should be the absolute file path to your theme templates.
// using __dirname gets us the directory of your gatsby-node.js, so
// we can append a path relative to your gatsby-node.js.
const myThemeTemplatesDirectoryPath = `${__dirname}/wp-templates`

// This function will register your template directory with gatsby-plugin-wordpress
// to be used when selecting templates when pages are created.
// this does not need to be called in any Gatsby lifecycle method
addTemplateDirectory(myThemeTemplatesDirectoryPath)

// of course you could just write it like:
// addTemplateDirectory(`${__dirname}/wp-templates`)
```

### Creating a useful archive template fallback

In order to create a template that will work for more than 1 type, you will need to craft a GraphQL query that will allow this. Luckily WPGraphQL provides us with a type which spans across content types in WordPress. This type is the `ContentNode` type and includes Posts, Pages, MediaItems, and any other registered CPT type. Using it would look something like the following:

```js
export const query = graphql`
  query DefaultArchive(
    $archiveNodeIds: [String]!
    $sortOrder: [SortOrderEnum]!
    $sortFields: [WpContentNodeFieldsEnum]!
  ) {
    allWpContentNode(
      filter: { id: { in: $archiveNodeIds } }
      sort: { fields: $sortFields, order: $sortOrder }
    ) {
      nodes {
        # add your fields here.
        # id
        # uri
        # etc
      }
    }
  }
`
```

Since your archive page can also be a single page at the same time (the only requirement is that you have a single page with the same url as an archive), you can add support for pulling in the single node data like so:

```js
export const query = graphql`
  query DefaultArchive(
    $archiveNodeIds: [String]!
    $sortOrder: [SortOrderEnum]!
    $sortFields: [WpContentNodeFieldsEnum]!
    $id: String
  ) {
    wpContentNode(id: { eq: $id }) {
      id
    }

    # this example is from the last section above ☝️
    allWpContentNode(
      filter: { id: { in: $archiveNodeIds } }
      sort: { fields: $sortFields, order: $sortOrder }
    ) {
      nodes {
        id
      }
    }
  }
`
```

If you want to only query for your single node on the first archive page, you can do the following:

```js
export const query = graphql`
  query DefaultArchive(
    $archiveNodeIds: [String]!
    $sortOrder: [SortOrderEnum]!
    $sortFields: [WpContentNodeFieldsEnum]!
    $id: String
    $isFirstArchivePage: Boolean
  ) {
    wpContentNode(id: { eq: $id }) @include(if: $isFirstArchivePage) {
      id
    }
  }
`
```

## Relevant Links

- [Changelog](./CHANGELOG.md)
- [License](./LICENSE)
- [Gatsby Source WordPress Experimental](https://github.com/gatsbyjs/gatsby-source-wordpress-experimental)
- [WPGatsby](https://github.com/gatsbyjs/wp-gatsby)
- [WPGraphQL](https://github.com/wp-graphql/wp-graphql)
- [Gatsby](https://www.gatsbyjs.org/)
- [WordPress](https://wordpress.org/)
