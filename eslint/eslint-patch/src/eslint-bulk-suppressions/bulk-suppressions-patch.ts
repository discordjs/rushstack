// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import type { TSESTree } from '@typescript-eslint/types';
import { type SpawnSyncReturns, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

import * as Guards from './ast-guards';

import { eslintFolder } from '../_patch-base';

interface ISuppression {
  file: string;
  scopeId: string;
  rule: string;
}

interface IBulkSuppressionsJson {
  suppressions: ISuppression[];
}

const SUPPRESSIONS_JSON_FILENAME: string = '.eslint-bulk-suppressions.json';
const ESLINTRC_FILENAMES: string[] = [
  '.eslintrc.js',
  '.eslintrc.cjs'
  // Several other filenames are allowed, but this patch requires that it be loaded via a JS config file,
  // so we only need to check for the JS-based filenames
];

function getNodeName(node: TSESTree.Node): string | undefined {
  if (Guards.isClassDeclarationWithName(node)) {
    return node.id.name;
  } else if (Guards.isFunctionDeclarationWithName(node)) {
    return node.id.name;
  } else if (Guards.isClassExpressionWithName(node)) {
    return node.id.name;
  } else if (Guards.isFunctionExpressionWithName(node)) {
    return node.id.name;
  } else if (Guards.isNormalVariableDeclaratorWithAnonymousExpressionAssigned(node)) {
    return node.id.name;
  } else if (Guards.isNormalObjectPropertyWithAnonymousExpressionAssigned(node)) {
    return node.key.name;
  } else if (Guards.isNormalClassPropertyDefinitionWithAnonymousExpressionAssigned(node)) {
    return node.key.name;
  } else if (Guards.isNormalAssignmentPatternWithAnonymousExpressionAssigned(node)) {
    return node.left.name;
  } else if (Guards.isNormalMethodDefinition(node)) {
    return node.key.name;
  } else if (Guards.isTSEnumDeclaration(node)) {
    return node.id.name;
  } else if (Guards.isTSInterfaceDeclaration(node)) {
    return node.id.name;
  } else if (Guards.isTSTypeAliasDeclaration(node)) {
    return node.id.name;
  }
}

type NodeWithParent = TSESTree.Node & { parent?: TSESTree.Node };

function calculateScopeId(node: NodeWithParent | undefined): string {
  const scopeIds: string[] = [];
  for (let current: NodeWithParent | undefined = node; current; current = current.parent) {
    const scopeIdForASTNode: string | undefined = getNodeName(current);
    if (scopeIdForASTNode !== undefined) {
      scopeIds.unshift(scopeIdForASTNode);
    }
  }

  if (scopeIds.length === 0) {
    return '.';
  } else {
    return '.' + scopeIds.join('.');
  }
}

const eslintrcPathByFileOrFolderPath: Map<string, string> = new Map();

function findEslintrcFolderPath(fileAbsolutePath: string): string {
  const cachedFolderPathForFilePath: string | undefined =
    eslintrcPathByFileOrFolderPath.get(fileAbsolutePath);
  if (cachedFolderPathForFilePath) {
    return cachedFolderPathForFilePath;
  }

  const normalizedFilePath: string = fileAbsolutePath.replace(/\\/g, '/');
  const normalizedFileFolderPath: string = normalizedFilePath.substring(
    0,
    normalizedFilePath.lastIndexOf('/')
  );

  const pathsToCache: string[] = [fileAbsolutePath];
  let eslintrcFolderPath: string | undefined;
  for (
    let currentFolder: string = normalizedFileFolderPath;
    currentFolder; // 'something'.substring(0, -1) is ''
    currentFolder = currentFolder.substring(0, currentFolder.lastIndexOf('/'))
  ) {
    const cachedEslintrcFolderPath: string | undefined = eslintrcPathByFileOrFolderPath.get(currentFolder);
    if (cachedEslintrcFolderPath) {
      return cachedEslintrcFolderPath;
    }

    pathsToCache.push(currentFolder);
    for (const iterator of ESLINTRC_FILENAMES) {
      if (fs.existsSync(`${currentFolder}/${iterator}`)) {
        eslintrcFolderPath = currentFolder;
        break;
      }
    }
  }

  if (eslintrcFolderPath) {
    for (const checkedFolder of pathsToCache) {
      eslintrcPathByFileOrFolderPath.set(checkedFolder, eslintrcFolderPath);
    }

    return eslintrcFolderPath;
  } else {
    throw new Error(`Cannot locate an ESLint configuration file for ${fileAbsolutePath}`);
  }
}

const suppressionsJsonByFolderPath: Map<string, IBulkSuppressionsJson> = new Map();
function getSuppressionsJsonForEslintrcFolderPath(eslintrcFolderPath: string): IBulkSuppressionsJson {
  let suppressionsJson: IBulkSuppressionsJson | undefined =
    suppressionsJsonByFolderPath.get(eslintrcFolderPath);
  if (!suppressionsJson) {
    const suppressionsPath: string = `${eslintrcFolderPath}/${SUPPRESSIONS_JSON_FILENAME}`;
    try {
      suppressionsJson = require(suppressionsPath);
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw e;
      }
    }

    if (!suppressionsJson) {
      suppressionsJson = { suppressions: [] };
    }

    suppressionsJsonByFolderPath.set(eslintrcFolderPath, suppressionsJson);
  }

  return suppressionsJson;
}

function shouldWriteSuppression(suppression: ISuppression): boolean {
  if (process.env.ESLINT_BULK_SUPPRESS === undefined) {
    return false;
  }

  const rulesToSuppress: string[] = process.env.ESLINT_BULK_SUPPRESS.split(',');

  if (rulesToSuppress.length === 1 && rulesToSuppress[0] === '*') {
    return true;
  }

  return rulesToSuppress.includes(suppression.rule);
}

function isSuppressed(suppressionsJson: IBulkSuppressionsJson, suppression: ISuppression): boolean {
  return (
    suppressionsJson.suppressions.find(
      (element) =>
        element.file === suppression.file &&
        element.scopeId === suppression.scopeId &&
        element.rule === suppression.rule
    ) !== undefined
  );
}

function insort<T>(array: T[], item: T, compareFunction: (a: T, b: T) => number): void {
  const index: number = array.findIndex((element) => compareFunction(element, item) > 0);
  if (index === -1) {
    array.push(item);
  } else {
    array.splice(index, 0, item);
  }
}

function compareSuppressions(a: ISuppression, b: ISuppression): -1 | 0 | 1 {
  if (a.file < b.file) {
    return -1;
  } else if (a.file > b.file) {
    return 1;
  } else if (a.scopeId < b.scopeId) {
    return -1;
  } else if (a.scopeId > b.scopeId) {
    return 1;
  } else if (a.rule < b.rule) {
    return -1;
  } else if (a.rule > b.rule) {
    return 1;
  } else {
    return 0;
  }
}

function writeSuppressionsJsonToFile(
  eslintrcDirectory: string,
  suppressionsJson: IBulkSuppressionsJson
): void {
  const suppressionsPath: string = `${eslintrcDirectory}/${SUPPRESSIONS_JSON_FILENAME}`;
  suppressionsJsonByFolderPath.set(eslintrcDirectory, suppressionsJson);
  fs.writeFileSync(suppressionsPath, JSON.stringify(suppressionsJson, null, 2));
}

const usedSuppressions: Set<string> = new Set<string>();

function serializeSuppression(fileAbsolutePath: string, suppression: ISuppression): string {
  return `${fileAbsolutePath}|${suppression.file}|${suppression.scopeId}|${suppression.rule}`;
}

// One-line insert into the ruleContext report method to prematurely exit if the ESLint problem has been suppressed
export function shouldBulkSuppress(params: {
  filename: string;
  currentNode: TSESTree.Node;
  ruleId: string;
}): boolean {
  // Use this ENV variable to turn off eslint-bulk-suppressions functionality, default behavior is on
  if (process.env.ESLINT_BULK_ENABLE === 'false') {
    return false;
  }

  const { filename: fileAbsolutePath, currentNode, ruleId: rule } = params;
  const eslintrcDirectory: string = findEslintrcFolderPath(fileAbsolutePath);
  const fileRelativePath: string = path.relative(eslintrcDirectory, fileAbsolutePath);
  const scopeId: string = calculateScopeId(currentNode);
  const suppression: ISuppression = { file: fileRelativePath, scopeId, rule };

  const suppressionsJson: IBulkSuppressionsJson = getSuppressionsJsonForEslintrcFolderPath(eslintrcDirectory);
  const currentNodeIsSuppressed: boolean = isSuppressed(suppressionsJson, suppression);

  if (currentNodeIsSuppressed && shouldWriteSuppression(suppression)) {
    insort(suppressionsJson.suppressions, suppression, compareSuppressions);
    writeSuppressionsJsonToFile(eslintrcDirectory, suppressionsJson);
  }

  if (currentNodeIsSuppressed) {
    usedSuppressions.add(serializeSuppression(fileAbsolutePath, suppression));
  }

  return currentNodeIsSuppressed;
}

export function onFinish(params: { filename: string }): void {
  if (process.env.ESLINT_BULK_PRUNE === 'true') {
    bulkSuppressionsPrune(params);
  }
}

function bulkSuppressionsPrune(params: { filename: string }): void {
  const { filename: fileAbsolutePath } = params;
  const eslintrcFolderPath: string = findEslintrcFolderPath(fileAbsolutePath);
  const suppressionsJson: IBulkSuppressionsJson =
    getSuppressionsJsonForEslintrcFolderPath(eslintrcFolderPath);
  const newSuppressionsJson: IBulkSuppressionsJson = {
    suppressions: suppressionsJson.suppressions.filter((suppression) => {
      return usedSuppressions.has(serializeSuppression(fileAbsolutePath, suppression));
    })
  };

  writeSuppressionsJsonToFile(eslintrcFolderPath, newSuppressionsJson);
}

// utility function for linter-patch.js to make require statements that use relative paths in linter.js work in linter-patch.js
export function requireFromPathToLinterJS(importPath: string): import('eslint').Linter {
  if (!eslintFolder) {
    return require(importPath);
  }

  const pathToLinterFolder: string = `${eslintFolder}/lib/linter`;
  const moduleAbsolutePath: string = require.resolve(importPath, { paths: [pathToLinterFolder] });
  return require(moduleAbsolutePath);
}

export function patchClass<T, U extends T>(originalClass: new () => T, patchedClass: new () => U): void {
  // Get all the property names of the patched class prototype
  const patchedProperties: string[] = Object.getOwnPropertyNames(patchedClass.prototype);

  // Loop through all the properties
  for (const prop of patchedProperties) {
    // Override the property in the original class
    originalClass.prototype[prop] = patchedClass.prototype[prop];
  }

  // Handle getters and setters
  for (const [prop, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(patchedClass.prototype))) {
    if (descriptor.get || descriptor.set) {
      Object.defineProperty(originalClass.prototype, prop, descriptor);
    }
  }
}

export const patchFilePath: string = __filename;
