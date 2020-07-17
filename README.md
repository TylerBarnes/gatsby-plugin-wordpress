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

# gatsby-plugin-wordpress

This plugin is a wrapper around [`gatsby-source-wordpress-experimental`](https://github.com/gatsbyjs/gatsby-source-wordpress-experimental). The intent behind this plugin is to layer useful abstractions inspired by WordPress core on top of the data sourcing and caching work that the source plugin does.

## How to use

The plugin options for this plugin are passed directly through to `gatsby-source-wordpress-experimental`. Any options for this plugin should be mixed in with the options for the source plugin. You should install this plugin _instead of_ the source plugin, not alongside it. Configure this plugin as if it is the source plugin. Refer to the [source plugins docs](https://github.com/gatsbyjs/gatsby-source-wordpress-experimental) for more info on available plugin options.

## Features

Currently the only feature of this plugin is that it creates pages for you using a simplified [template hierarchy](https://wphierarchy.com/) similar to what a PHP WordPress frontend will give you.
Single pages will be created for you, and archive pages (like a blog listing) can be enabled as needed. Pages are created automatically and use templates that are found either in your Gatsby project, or in a Gatsby theme that registers templates with this plugin.

## Page Creation

In this plugin, we have 2 conceptual types of pages. Single post pages and archive pages. A single post page is a page representing a single page or post from WordPress. An archive page is a set of pages which list out a historical list of posts or pages. Archive pages are paginated and numbered `/blog/`, `/blog/2/`, etc.

Out of the box this plugin will create Gatsby pages out of your WordPress pages automatically. No archive pages will be generated until enabled via options.

### Single Page Routing

Pages, Posts, and any custom post types will have their single post pages generated as long as there is a corresponding template available at `./src/wp-templates/single/index.js` or `./src/wp-templates/single/TypeName.js` (for example `./src/wp-templates/single/Post.js`). MediaItems, Users, and other types will not have single pages generated for them until enabled via plugin options.

You can enable them like so:

```js
{
  resolve: "gatsby-plugin-wordpress",
  options: {
    type: {
      MediaItems: {
        routing: {
          single: true
        }
      }
    }
  }
}
```

If you want to disable all single pages out of the box, you can use type options for the `ContentNode` type. Perhaps you want to disable all single pages except for posts. That can be achieved as follows:

```js
{
  resolve: "gatsby-plugin-wordpress",
  options: {
    type: {
      ContentNode: { // applies to all posts, pages, and custom post types.
        routing: {
          single: false,
        }
      },
      Post: {
        routing: {
          // now that all single page routes are disabled
          // we can enable single page routes just for Post nodes
          single: true,
        }
      }
    }
  }
}
```

Single page routing works based on a pre-defined file structure and contains a very simple hierarchy. All templates for our routing and hierarchy should be created/placed in `./src/wp-templates/`. For single pages, you can create a `./src/wp-templates/single/index.js` which will be used as a fallback template for any node type which doesn't have a more specific template. More specific templates should be created with the typename of the node you're targeting. For example for Post nodes you should create a template at `./src/wp-templates/single/Post.js`. This typename comes from WPGraphQL and it's important that the proper case is used. `./src/wp-templates/single/post.js` will not work.

### Archive Page Routing

By default no paginated archive pages will be built. You will need to manually enable them in your config and enable archive pages for each CPT in WordPress.

To enable archive pages for a type, add the following to your config:

```js
{
  resolve: "gatsby-plugin-wordpress",
  options: {
    type: {
      // Enables archive pages for all posts, pages, and custom post types.
      ContentNode: {
        routing: {
          archive: true,
        }
      },
      // Enables archive pages for users
      User: {
        routing: {
          archive: true,
        }
      }
    }
  }
}
```

#### Posts per paginated archive page

By default the number of nodes/posts per page will be 10, but you can customize that with the `perPage` route option:

```js
{
  resolve: "gatsby-plugin-wordpress",
  options: {
    type: {
      Post: {
        routing: {
          perPage: 20,
        }
      }
    }
  }
}
```

#### Changing the archive URL

The URL of your archive pages will be automatically taken from the WordPress archive page permalink. It's recommended to only change this URL on the WordPress side so that WP logic can be aware of what your archive pages URL's are. However, if you need to you can change this on the Gatsby side you can do so using the `archivePathBase` routing option.

```js
{
  resolve: "gatsby-plugin-wordpress",
  options: {
    type: {
      Post: {
        routing: {
          archivePathBase: `/my-special-blog-url/very-nice/`,
        }
      }
    }
  }
}
```

Note that if a single page and an archive page share the same URL and archive routing is enabled, they will both use the archive page template.

#### Archive page template hierarchy

Archive page routing works based on a pre-defined file structure and contains a very simple hierarchy. All templates for our routing and hierarchy should be created/placed in `./src/wp-templates/`. For archive pages, you can create a `./src/wp-templates/archive/index.js` which will be used as a fallback template for any node type which doesn't have a more specific template. More specific templates should be created with the typename of the node you're targeting. For example for Post nodes you should create a template at `./src/wp-templates/archive/Post.js`. This typename comes from WPGraphQL and it's important that the proper case is used. `./src/wp-templates/archive/post.js` will not work.

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

## Relevant Links :link:

- [Changelog](./CHANGELOG.md)
- [License](./LICENSE)
- [Gatsby Source WordPress Experimental](https://github.com/gatsbyjs/gatsby-source-wordpress-experimental)
- [WPGatsby](https://github.com/gatsbyjs/wp-gatsby)
- [WPGraphQL](https://github.com/wp-graphql/wp-graphql)
- [Gatsby](https://www.gatsbyjs.org/)
- [WordPress](https://wordpress.org/)
