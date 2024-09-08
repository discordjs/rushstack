// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

// This is a workaround for ESLint's requirement to consume shareable configurations from package names prefixed
// with "eslint-config".
//
// To remove this requirement, add this line to the top of your project's .eslintrc.js file:
//
//    require("@rushstack/eslint-patch/custom-config-package-names");
//
import { configArrayFactory, ModuleResolver, Naming } from './_patch-base';

if (!configArrayFactory.__loadExtendedShareableConfigPatched) {
  configArrayFactory.__loadExtendedShareableConfigPatched = true;
  // eslint-disable-next-line @typescript-eslint/typedef
  const originalLoadExtendedShareableConfig = configArrayFactory.prototype._loadExtendedShareableConfig;

  // Common between ESLint versions
  // https://github.com/eslint/eslintrc/blob/242d569020dfe4f561e4503787b99ec016337457/lib/config-array-factory.js#L910
  configArrayFactory.prototype._loadExtendedShareableConfig = function (extendName: string): unknown {
    const originalResolve: (moduleName: string, relativeToPath: string) => string = ModuleResolver.resolve;
    try {
      ModuleResolver.resolve = function (moduleName: string, relativeToPath: string): string {
        try {
          return originalResolve.call(this, moduleName, relativeToPath);
        } catch (e) {
          // Only change the name we resolve if we cannot find the normalized module, since it is
          // valid to rely on the normalized package name. Use the originally provided module path
          // instead of the normalized module path.
          if (
            (e as NodeJS.ErrnoException)?.code === 'MODULE_NOT_FOUND' &&
            moduleName !== extendName &&
            moduleName === Naming.normalizePackageName(extendName, 'eslint-config')
          ) {
            return originalResolve.call(this, extendName, relativeToPath);
          } else {
            throw e;
          }
        }
      };
      return originalLoadExtendedShareableConfig.apply(this, arguments);
    } finally {
      ModuleResolver.resolve = originalResolve;
    }
  };
}
