<<<<<<< HEAD
=======
// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

>>>>>>> 919c8395 (added docusaurus doc files)
import { themes as prismThemes } from "prism-react-renderer";

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "MAIPL",
  tagline: "The Marine Artificial Intelligence PLatform",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://your-docusaurus-site.example.com",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

<<<<<<< HEAD
  organizationName: "MERIDIAN-private",
  projectName: "docs",
=======
  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "MERIDIAN-private", // Usually your GitHub org/user name.
  projectName: "docs", // Usually your repo name.
>>>>>>> 919c8395 (added docusaurus doc files)

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

<<<<<<< HEAD
=======
  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
>>>>>>> 919c8395 (added docusaurus doc files)
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.js",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: "MAIPL",
        items: [
          {
            type: "docSidebar",
<<<<<<< HEAD
            sidebarId: "docs",
            position: "left",
            label: "Documentation",
          },
          { to: "page", label: "Example Page", position: "left" },
=======
            sidebarId: "tutorialSidebar",
            position: "left",
            label: "Documentation",
          },
          { to: "page1", label: "Another Page", position: "left" },
          // {
          //   href: "https://git-dev.cs.dal.ca/meridian-private/maipl/docs",
          //   label: "GitLab",
          //   position: "right",
          // },
>>>>>>> 919c8395 (added docusaurus doc files)
        ],
      },
      footer: {
        style: "light",
<<<<<<< HEAD
=======
        // links: [
        //   {
        //     title: "Community",
        //     items: [
        //       {
        //         label: "MERIDIAN",
        //         href: "https://meridian.cs.dal.ca/",
        //       },
        //       {
        //         label: "Twitter",
        //         href: "https://twitter.com/MERIDIAN_CFI",
        //       },
        //     ],
        //   },
        // ],
>>>>>>> 919c8395 (added docusaurus doc files)
        copyright: `Copyright © ${new Date().getFullYear()} MAIPL`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
