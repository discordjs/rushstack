// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

/**
 * `AstEntity` is the abstract base class for analyzer objects that can become a `CollectorEntity`.
 *
 * @remarks
 *
 * The subclasses are:
 * ```
 * - AstEntity
 *   - AstSymbol
 *   - AstSyntheticEntity
 *     - AstImport
 *     - AstImportAsModule
 * ```
 */
export abstract class AstEntity {
  /**
   * The original name of the symbol, as exported from the module (i.e. source file)
   * containing the original TypeScript definition.  Constructs such as
   * `import { X as Y } from` may introduce other names that differ from the local name.
   *
   * @remarks
   * For the most part, `localName` corresponds to `followedSymbol.name`, but there
   * are some edge cases.  For example, the ts.Symbol.name for `export default class X { }`
   * is actually `"default"`, not `"X"`.
   */
  public abstract readonly localName: string;
}

/**
 * `AstSyntheticEntity` is the abstract base class for analyzer objects whose emitted declarations
 * are not text transformations performed by the `Span` helper.
 *
 * @remarks
 * Most of API Extractor's output is produced by using the using the `Span` utility to regurgitate strings from
 * the input .d.ts files.  If we need to rename an identifier, the `Span` visitor can pick out an interesting
 * node and rewrite its string, but otherwise the transformation operates on dumb text and not compiler concepts.
 * (Historically we did this because the compiler's emitter was an internal API, but it still has some advantages.)
 *
 * This strategy does not work for cases where the output looks very different from the input.  Today these
 * cases are always kinds of `import` statements, but that may change in the future.
 */
export abstract class AstSyntheticEntity extends AstEntity {}
