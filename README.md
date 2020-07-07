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

This plugin is a wrapper around [`gatsby-source-wordpress-experimental`](https://github.com/gatsbyjs/gatsby-source-wordpress-experimental). The intent behind this plugin is to layer useful abstractions inspired by WordPress core on top of the data sourcing and caching work that the aforementioned plugin does.

## How to use

The plugin options for this plugin are passed directly through to `gatsby-source-wordpress-experimental`. Any options for this plugin should be mixed in with the options for the source plugin. You should install this plugin _instead of_ the source plugin, not alongside it. Configure this plugin as if it is the source plugin. Refer to the [source plugins docs](https://github.com/gatsbyjs/gatsby-source-wordpress-experimental) for more info on available plugin options.

## Routing

In this plugin, we have 2 conceptual types of pages. Single post pages and archive pages. A single post page is a page representing a single page or post from WordPress. An archive page is a set of pages which list out a historical list of posts or pages. Archive pages are paginated and numbered `/blog/`, `/blog/2/`, etc.

Out of the box this plugin will create Gatsby pages out of your WordPress pages automatically. No archive pages will be generated until enabled via options.

### Single Page Routing

Pages, Posts, and any custom post types will have their single post pages generated as long as there is a corresponding template available at `./src/wp-templates/single/index.js` or `./src/wp-templates/single/TypeName.js`. MediaItems, Users, and other types will not have single pages generated for them until enabled via plugin options.

You can enable them like so:

```js
{
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

Routing works based on a pre-defined file structure and contains a very simple hierarchy. All templates for our routing and hierarchy should be created/placed in `./src/wp-templates/`. For single pages, you can create a `./src/wp-templates/single/index.js` which will be used as a fallback template for any node type which doesn't have a more specific template. More specific templates should be created with the typename of the node you're targeting. For example for Post nodes you should create a template at `./src/wp-templates/single/Post.js`. This typename comes from WPGraphQL and it's important that the proper case is used. `./src/wp-templates/single/post.js` will not work.

### Archive Page Routing

@todo

### Adding templates via themes

@todo

## Relevant Links :link:

- [Changelog](./CHANGELOG.md)
- [License](./LICENSE)
- [Gatsby Source WordPress Experimental](https://github.com/gatsbyjs/gatsby-source-wordpress-experimental)
- [WPGatsby](https://github.com/gatsbyjs/wp-gatsby)
- [WPGraphQL](https://github.com/wp-graphql/wp-graphql)
- [Gatsby](https://www.gatsbyjs.org/)
- [WordPress](https://wordpress.org/)
