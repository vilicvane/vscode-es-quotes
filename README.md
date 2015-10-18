# ES Quotes for Visual Studio Code

A simple quotes helper for JavaScript and TypeScript.

It uses a simplified parser to build the string tree then handle the replacement.
So don't worry about your comments containing quotes.

Currently it can only handle strings without concatenation, but will support more transforms in the future.

## Install

`Ctrl/Cmd + Shift + P` in Visual Studio Code, then:

```sh
ext install es-quotes
```

## Commands

- `esQuotes.switchToTemplateString`
  Switch a normal string to a template string.
- `esQuotes.switchToNormalString`
  Switch a template string to a normal string.
- `esQuotes.switchBetweenSingleDoubleQuotes`
  Switch a normal string between single and double quotes.

## Options

- `esQuotes.defaultQuote`
  Default quote when switching to a normal string. Can be either `'` or `"`.

## License

MIT License.
