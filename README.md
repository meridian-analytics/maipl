## Adding Content

### 1. Adding a New Doc

To add a new document to the documentation site, follow these steps:

- Navigate to the `docs` directory in the project.
- Create a new markdown file with a unique name, e.g., `new-doc.md`.
- Write your documentation content using Markdown syntax.

### 2. Adding a New Page

To add a new page to the documentation site, follow these steps:

- Navigate to the pages directory in the project.
- Create a new JavaScript file with a unique name, e.g., new-page.js.
- Write your page content using React components.

The new page is then referenced in the `docusaurus.config.js` file under `navbar` as follows:

{ to: "new-page.js", label: "A unique name for the page", position: "left/right" }

### 3. Adding a New React Component

To add a new React component to the documentation site, follow these steps:

- Create a new JavaScript file for your component in the src/components directory, e.g., CustomComponent.js.
- Write your React component code.

Once you've created the React component, you can use it within your documentation pages or markdown files.

```
---
id: custom-component-doc
title: Custom Component Doc
---

# Custom Component Doc

You can use the custom React component as follows:

<CustomComponent />
```

### 4. Adding external links

To add an external link to the documentation site, you use the following syntax:

```
[Link Text](URL)
```

Replace "Link Text" with the text you want to display for the link, and "URL" with the actual URL you want to link to.

### 5. Adding internal links

To link a different document within the documentation site, simply reference the filename without the .md extension

```
[Link to Another Document](another-document)
```

Replace "Link to Another Document" with the text you want to display for the link, and "another-document" with the filename you want to link to.
