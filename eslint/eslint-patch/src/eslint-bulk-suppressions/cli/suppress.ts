// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.

import { ExecException, exec } from 'child_process';
import { getEslintCli } from './utils/get-eslint-cli';
import { printSuppressHelp } from './utils/print-help';

export function suppress() {
  const args = process.argv.slice(3);

  if (args.includes('--help') || args.includes('-h')) {
    printSuppressHelp();
    process.exit(0);
  }

  // Use reduce to create an object with all the parsed arguments
  const parsedArgs = args.reduce<{
    rules: string[];
    all: boolean;
    files: string[];
  }>(
    (acc, arg, index, arr) => {
      if (arg === '--rule') {
        // continue because next arg should be the rule
      } else if (index > 0 && arr[index - 1] === '--rule' && arr[index + 1]) {
        acc.rules.push(arg);
      } else if (arg === '--all') {
        acc.all = true;
      } else if (arg.startsWith('--')) {
        throw new Error(`@rushstack/eslint-bulk: Unknown option: ${arg}`);
      } else {
        acc.files.push(arg);
      }
      return acc;
    },
    { rules: [], all: false, files: [] }
  );

  if (parsedArgs.files.length === 0) {
    throw new Error(
      '@rushstack/eslint-bulk: Files argument is required. Use glob patterns to specify files or use `.` to suppress all files for the specified rules.'
    );
  }

  if (parsedArgs.rules.length === 0 && !parsedArgs.all) {
    throw new Error(
      '@rushstack/eslint-bulk: Please specify at least one rule to suppress. Use --all to suppress all rules.'
    );
  }

  const eslintCLI = getEslintCli(process.cwd());

  // Find the index of the last argument that starts with '--'
  const lastOptionIndex = args
    .map((arg, i) => (arg.startsWith('--') ? i : -1))
    .reduce((lastIndex, currentIndex) => Math.max(lastIndex, currentIndex), -1);

  // Check if options come before files
  if (parsedArgs.files.some((file) => args.indexOf(file) < lastOptionIndex)) {
    throw new Error(
      '@rushstack/eslint-bulk: Unable to parse command line arguments. All options should come before files argument.'
    );
  }

  const env: NodeJS.ProcessEnv = { ...process.env };
  if (parsedArgs.all) {
    env.ESLINT_BULK_SUPPRESS = '*';
  } else if (parsedArgs.rules.length > 0) {
    env.ESLINT_BULK_SUPPRESS = parsedArgs.rules.join(',');
  }

  exec(
    `${eslintCLI} ${parsedArgs.files.join(' ')} --format=json`,
    { env },
    (error: ExecException | null, stdout: string, stderr: string) => {
      // if errorCount != 0, ESLint will process.exit(1) giving the false impression
      // that the exec failed, even though linting errors are to be expected
      const eslintOutputWithErrorRegex = /"errorCount":(?!0)\d+/;
      const isEslintError = error !== null && error.code === 1 && eslintOutputWithErrorRegex.test(stdout);

      if (error && !isEslintError) {
        throw new Error(`@rushstack/eslint-bulk execution error: ${error.message}`);
      }

      if (stderr) {
        throw new Error(`@rushstack/eslint-bulk ESLint errors: ${stderr}`);
      }

      if (parsedArgs.all) {
        console.log(
          `@rushstack/eslint-bulk: Successfully suppressed all rules for file(s) ${parsedArgs.files}`
        );
      } else if (parsedArgs.rules.length > 0) {
        console.log(
          `@rushstack/eslint-bulk: Successfully suppressed rules ${parsedArgs.rules} for file(s) ${parsedArgs.files}`
        );
      }
    }
  );
}
