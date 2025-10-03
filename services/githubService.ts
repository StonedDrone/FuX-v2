// This service handles fetching repository content from the GitHub API.

// A list of file extensions to include when fetching repo content.
const SUPPORTED_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.go', '.rs', '.java', '.cs', '.html', '.css'];
// A list of common directories and files to ignore.
const IGNORED_ITEMS = ['node_modules', 'dist', 'build', '.git', 'vendor', 'target', 'package-lock.json', 'yarn.lock'];

interface GithubContent {
  path: string;
  name: string;
  type: 'file' | 'dir';
  download_url: string | null;
}

/**
 * Parses a GitHub URL to extract the owner and repository name.
 * @param url The full GitHub URL.
 * @returns An object with owner and repo, or null if the format is invalid.
 */
const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (match && match[1] && match[2]) {
    // Remove potential trailing .git from repo name
    return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
  }
  return null;
};

/**
 * Recursively fetches the content of all supported files in a repository.
 * @param owner The repository owner.
 * @param repo The repository name.
 * @param path The current path within the repository to fetch.
 * @returns A promise that resolves to a single string containing all concatenated code.
 */
const fetchRepoTree = async (owner: string, repo: string, path: string = ''): Promise<string> => {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    // Note: This uses unauthenticated requests, which are rate-limited by GitHub (60 reqs/hour per IP).
    // For a production app, an OAuth token would be needed in the headers.
    const response = await fetch(apiUrl);

    if (!response.ok) {
        // If a directory is not found, we can often just ignore it.
        if (response.status === 404) {
             console.warn(`Path not found, skipping: ${apiUrl}`);
             return '';
        }
        // For other errors (like rate limiting), we should throw.
        throw new Error(`GitHub API error (${response.status}): ${await response.text()}`);
    }

    const contents: GithubContent[] = await response.json();
    let allCode = '';

    for (const item of contents) {
        if (IGNORED_ITEMS.includes(item.name)) {
            continue;
        }

        if (item.type === 'dir') {
            allCode += await fetchRepoTree(owner, repo, item.path);
        } else if (item.type === 'file' && item.download_url) {
            if (SUPPORTED_EXTENSIONS.some(ext => item.path.endsWith(ext))) {
                try {
                    const fileContentResponse = await fetch(item.download_url);
                    if (fileContentResponse.ok) {
                        const fileContent = await fileContentResponse.text();
                        allCode += `\n\n# --- FILE: ${item.path} ---\n\n${fileContent}`;
                    }
                } catch (e) {
                    console.warn(`Failed to download file content for ${item.path}`, e);
                }
            }
        }
    }
    return allCode;
};

export const githubService = {
  /**
   * Fetches all relevant source code from a given GitHub repository URL.
   * @param repoUrl The full URL of the public GitHub repository.
   * @returns An object containing the repository name and the concatenated content.
   */
  fetchRepoContents: async (repoUrl: string): Promise<{ repoName: string; content: string }> => {
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      throw new Error("Invalid GitHub repository URL format. Expected: https://github.com/owner/repo");
    }
    const { owner, repo } = parsed;

    const content = await fetchRepoTree(owner, repo);
    
    if (!content.trim()) {
        throw new Error(`No supported source code files found in the repository "${repo}". Supported extensions: ${SUPPORTED_EXTENSIONS.join(', ')}`);
    }

    return { repoName: repo, content };
  }
};