// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { ApiItemKind } from '../items/ApiItem';
import { ApiStaticMixin, IApiStaticMixinOptions } from '../mixins/ApiStaticMixin';
import { IApiDeclarationMixinOptions, ApiDeclarationMixin } from '../mixins/ApiDeclarationMixin';
import { IApiParameterListMixinOptions, ApiParameterListMixin } from '../mixins/ApiParameterListMixin';
import { IApiReleaseTagMixinOptions, ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
import { IApiDocumentedItemOptions, ApiDocumentedItem } from '../items/ApiDocumentedItem';
import { ApiReturnTypeMixin, IApiReturnTypeMixinOptions } from '../mixins/ApiReturnTypeMixin';
import { IApiNameMixinOptions, ApiNameMixin } from '../mixins/ApiNameMixin';

/**
 * Constructor options for {@link ApiMethod}.
 * @public
 */
export interface IApiMethodOptions extends
  IApiDeclarationMixinOptions,
  IApiNameMixinOptions,
  IApiParameterListMixinOptions,
  IApiReleaseTagMixinOptions,
  IApiReturnTypeMixinOptions,
  IApiStaticMixinOptions,
  IApiDocumentedItemOptions {
}

/**
 * Represents a TypeScript member function declaration that belongs to an `ApiClass`.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiMethod` represents a TypeScript declaration such as the `render` member function in this example:
 *
 * ```ts
 * export class Widget {
 *   public render(): void { }
 * }
 * ```
 *
 * Compare with {@link ApiMethodSignature}, which represents a method belonging to an interface.
 * For example, a class method can be `static` but an interface method cannot.
 *
 * @public
 */
export class ApiMethod extends ApiDeclarationMixin(ApiNameMixin(ApiParameterListMixin(ApiReleaseTagMixin(
  ApiReturnTypeMixin(ApiStaticMixin(ApiDocumentedItem)))))) {

  public static getCanonicalReference(name: string, isStatic: boolean, overloadIndex: number): string {
    if (isStatic) {
      return `(${name}:static,${overloadIndex})`;
    } else {
      return `(${name}:instance,${overloadIndex})`;
    }
  }

  public constructor(options: IApiMethodOptions) {
    super(options);
  }

  /** @override */
  public get kind(): ApiItemKind {
    return ApiItemKind.Method;
  }

  /** @override */
  public get canonicalReference(): string {
    return ApiMethod.getCanonicalReference(this.name, this.isStatic, this.overloadIndex);
  }
}
