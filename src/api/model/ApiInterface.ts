// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { ApiItemKind } from '../items/ApiItem';
import { ApiItemContainerMixin, IApiItemContainerMixinOptions } from '../mixins/ApiItemContainerMixin';
import { ApiDeclaredItem, IApiDeclaredItemOptions, IApiDeclaredItemJson } from '../items/ApiDeclaredItem';
import { IApiReleaseTagMixinOptions, ApiReleaseTagMixin } from '../mixins/ApiReleaseTagMixin';
import { IExcerptTokenRange } from '../../index';
import { HeritageType } from './HeritageType';
import { IApiNameMixinOptions, ApiNameMixin } from '../mixins/ApiNameMixin';

/**
 * Constructor options for {@link ApiInterface}.
 * @public
 */
export interface IApiInterfaceOptions extends
  IApiItemContainerMixinOptions,
  IApiNameMixinOptions,
  IApiReleaseTagMixinOptions,
  IApiDeclaredItemOptions {

  extendsTokenRanges: IExcerptTokenRange[];
}

export interface IApiInterfaceJson extends IApiDeclaredItemJson {
  extendsTokenRanges: IExcerptTokenRange[];
}

/**
 * Represents a TypeScript class declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiInterface` represents a TypeScript declaration such as this:
 *
 * ```ts
 * export interface X extends Y {
 * }
 * ```
 *
 * @public
 */
export class ApiInterface extends ApiItemContainerMixin(ApiNameMixin(ApiReleaseTagMixin(ApiDeclaredItem))) {

  private readonly _extendsTypes: HeritageType[] = [];

  public static getCanonicalReference(name: string): string {
    return `(${name}:interface)`;
  }

  /** @override */
  public static onDeserializeInto(options: Partial<IApiInterfaceOptions>, jsonObject: IApiInterfaceJson): void {
    super.onDeserializeInto(options, jsonObject);

    options.extendsTokenRanges = jsonObject.extendsTokenRanges;
  }

  public constructor(options: IApiInterfaceOptions) {
    super(options);

    for (const extendsTokenRange of options.extendsTokenRanges) {
      this._extendsTypes.push(new HeritageType(this.buildExcerpt(extendsTokenRange)));
    }
  }

  /** @override */
  public get kind(): ApiItemKind {
    return ApiItemKind.Interface;
  }

  /** @override */
  public get canonicalReference(): string {
    return ApiInterface.getCanonicalReference(this.name);
  }

  /**
   * The list of base interfaces that this interface inherits from using the `extends` keyword.
   */
  public get extendsTypes(): ReadonlyArray<HeritageType> {
    return this._extendsTypes;
  }

  /** @override */
  public serializeInto(jsonObject: Partial<IApiInterfaceJson>): void {
    super.serializeInto(jsonObject);

    jsonObject.extendsTokenRanges = this.extendsTypes.map(x => x.excerpt.tokenRange);
  }
}
