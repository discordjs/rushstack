// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { ApiItem, ApiItemKind, IApiItemOptions, SerializedApiItem } from './ApiItem';
import { ApiItemContainerMixin } from '../mixins/ApiItemContainerMixin';
import { JsonFile } from '@microsoft/node-core-library';

export class ApiPackage extends ApiItemContainerMixin(ApiItem) {
  public static loadFromJsonFile(apiJsonFilename: string): ApiPackage {
    const jsonObject: { } = JsonFile.load(apiJsonFilename);
    return ApiItem.deserialize(jsonObject as SerializedApiItem<IApiItemOptions>) as ApiPackage;
  }

  /** @override */
  public get kind(): ApiItemKind {
    return ApiItemKind.Package;
  }

  /** @override */
  public get canonicalReference(): string {
    return this.name;
  }

  public saveToJsonFile(apiJsonFilename: string): void {
    const jsonObject: { } = { };
    this.serializeInto(jsonObject);
    JsonFile.save(jsonObject, apiJsonFilename);
  }
}
