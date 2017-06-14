# ES Quotes for Visual Studio Code

A simple quotes helper for JavaScript and TypeScript.

It uses a simplified parser to build the string tree then handle the replacement.
So don't worry about your comments containing quotes.

![es-quotes](https://cloud.githubusercontent.com/assets/970430/10563944/4cc04462-75d1-11e5-984b-41e0a21a72c3.gif)

And more.

![es-quotes-transform-template-strings](https://cloud.githubusercontent.com/assets/970430/11168910/ee3c5646-8bde-11e5-938e-00ed604aba3d.gif)

## Install

`Ctrl/Cmd + P` in Visual Studio Code, then:

```sh
ext install es-quotes
```

## Commands

- `esQuotes.transformToTemplateString`
  Transform a normal string to a template string.
- `esQuotes.transformToNormalString`
  Transform a template string to a normal string.
- `esQuotes.transformBetweenSingleDoubleQuotes`
  Transform a normal string between single and double quotes.
- `esQuotes.transformBetweenQuotes`
  Transform a normal string between single, double and template quotes.

## Options

- `esQuotes.defaultQuote`
  Default quote when transforming to a normal string. Can be either `'` or `"`.

## License

MIT License.
