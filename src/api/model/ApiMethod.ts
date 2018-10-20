// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { ApiItem, ApiItemKind } from './ApiItem';
import { ApiMembersMixin } from './Mixins';

export class ApiMethod extends ApiMembersMixin(ApiItem) {
  /** @override */
  public get kind(): ApiItemKind {
    return ApiItemKind.Method;
  }

  /** @override */
  public getSortKey(): string {
    return this.name;
  }
}
