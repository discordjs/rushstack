// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { ApiItemKind } from './ApiItem';
import { ApiPropertyItem, IApiPropertyItemOptions } from './ApiPropertyItem';

/**
 * Constructor options for {@link ApiPropertySignature}.
 * @public
 */
export interface IApiPropertySignatureOptions extends IApiPropertyItemOptions {
}

/**
 * Represents a TypeScript property declaration that belongs to an `ApiInterface`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiPropertySignature` represents a TypeScript declaration such as the `width` and `height` members in this example:
 *
 * ```ts
 * export interface IWidget {
 *   readonly width: number;
 *   height: number;
 * }
 * ```
 *
 * Compare with {@link ApiProperty}, which represents a property belonging to a class.
 * For example, a class property can be `static` but an interface property cannot.
 *
 * @public
 */
export class ApiPropertySignature extends ApiPropertyItem {

  public static getCanonicalReference(name: string): string {
    return name;
  }

  public constructor(options: IApiPropertySignatureOptions) {
    super(options);
  }

  /** @override */
  public get kind(): ApiItemKind {
    return ApiItemKind.PropertySignature;
  }

  /** @override */
  public get canonicalReference(): string {
    return ApiPropertySignature.getCanonicalReference(this.name);
  }
}
