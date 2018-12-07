// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { ApiItem, ApiItemKind } from './ApiItem';
import { ApiItemContainerMixin } from '../mixins/ApiItemContainerMixin';
import { ApiPackage } from './ApiPackage';
import { PackageName } from '@microsoft/node-core-library';
import { DeclarationReferenceResolver, IResolveDeclarationReferenceResult } from './DeclarationReferenceResolver';
import { DocDeclarationReference } from '@microsoft/tsdoc';

/**
 * A serializable representation of a collection of API declarations.
 *
 * @remarks
 *
 * An `ApiModel` represents a collection of API declarations that can be serialized to disk.  It captures all the
 * important information needed to generate documentation, without any reliance on the TypeScript compiler engine.
 *
 * An `ApiModel` acts as the root of a tree of objects that all inherit from the `ApiItem` base class.
 * The tree children are determined by the {@link ApiItemContainerMixin} mixin base class.  The model contains
 * packages.  Packages have an entry point (today, only one).  And the entry point can contain various types
 * of API declarations.  The container relationships might look like this:
 *
 * ```
 * Things that can contain other things:
 *
 * - ApiModel
 *   - ApiPackage
 *     - ApiEntryPoint
 *       - ApiClass
 *         - ApiMethod
 *         - ApiProperty
 *       - ApiEnum
 *         - ApiEnumMember
 *       - ApiInterface
 *         - ApiMethodSignature
 *         - ApiPropertySignature
 *       - ApiNamespace
 *         - (ApiClass, ApiEnum, ApiInterace, ...)
 *
 * ```
 *
 * Normally, API Extractor writes an .api.json file to disk for each project that it builds.  Then, a tool like
 * API Documenter can load the various `ApiPackage` objects into a single `ApiModel` and process them as a group.
 * This is useful because compilation generally occurs separately (e.g. because projects may reside in different
 * Git repos, or because they build with different TypeScript compiler configurations that may be incompatible),
 * whereas API Documenter cannot detect broken hyperlinks without seeing the entire documentation set.
 *
 * @public
 */
export class ApiModel extends ApiItemContainerMixin(ApiItem) {
  private readonly _resolver: DeclarationReferenceResolver;

  private _packagesByName: Map<string, ApiPackage> | undefined = undefined;

  public constructor() {
    super({ name: 'MODEL' });

    this._resolver = new DeclarationReferenceResolver(this);
  }

  public loadPackage(apiJsonFilename: string): ApiPackage {
    const apiPackage: ApiPackage = ApiPackage.loadFromJsonFile(apiJsonFilename);
    this.addMember(apiPackage);
    return apiPackage;
  }

  /** @override */
  public get kind(): ApiItemKind {
    return ApiItemKind.Model;
  }

  /** @override */
  public get canonicalReference(): string {
    return this.name;
  }

  public get packages(): ReadonlyArray<ApiPackage> {
    return this.members as ReadonlyArray<ApiPackage>;
  }

  /** @override */
  public addMember(member: ApiPackage): void {
    if (member.kind !== ApiItemKind.Package) {
      throw new Error('Only items of type ApiPackage may be added to an ApiModel');
    }
    super.addMember(member);

    this._packagesByName = undefined; // invalidate the cache
  }

  /**
   * Efficiently finds a package by the NPM package name.
   *
   * @remarks
   *
   * If the NPM scope is omitted in the package name, it will still be found provided that it is an unambiguous match.
   * For example, it's often convenient to write `{@link node-core-library#JsonFile}` instead of
   * `{@link @microsoft/node-core-library#JsonFile}`.
   */
  public tryGetPackageByName(packageName: string): ApiPackage | undefined {
    // Build the lookup on demand
    if (this._packagesByName === undefined) {
      this._packagesByName = new Map<string, ApiPackage>();

      const unscopedMap: Map<string, ApiPackage | undefined> = new Map<string, ApiPackage | undefined>();

      for (const apiPackage of this.packages) {
        if (this._packagesByName.get(apiPackage.name)) {
          // This should not happen
          throw new Error(`The model contains multiple packages with the name ${apiPackage.name}`);
        }

        this._packagesByName.set(apiPackage.name, apiPackage);

        const unscopedName: string = PackageName.parse(apiPackage.name).unscopedName;

        if (unscopedMap.has(unscopedName)) {
          // If another package has the same unscoped name, then we won't register it
          unscopedMap.set(unscopedName, undefined);
        } else {
          unscopedMap.set(unscopedName, apiPackage);
        }
      }

      for (const [unscopedName, apiPackage] of unscopedMap) {
        if (apiPackage) {
          if (!this._packagesByName.has(unscopedName)) {
            // If the unscoped name is unambiguous, then we can also use it as a lookup
            this._packagesByName.set(unscopedName, apiPackage);
          }
        }
      }
    }

    return this._packagesByName.get(packageName);
  }

  public resolveDeclarationReference(declarationReference: DocDeclarationReference,
    contextApiItem: ApiItem | undefined): IResolveDeclarationReferenceResult {
    return this._resolver.resolve(declarationReference, contextApiItem);
  }
}
