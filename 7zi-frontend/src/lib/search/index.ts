/**
 * Smart Search - 搜索模块导出
 * v1.12.3 - 模糊搜索与过滤
 */

// 模糊搜索
export {
  fuzzyMatch,
  fuzzyMatchItems,
  fuzzyMatchAll,
  fuzzyMatchAny,
  type FuzzySearchOptions,
  type FuzzyMatchResult
} from './fuzzy-search';

// 高亮显示
export {
  highlightMatch,
  highlightMatches,
  getHighlightedPreview,
  highlightMultiColor,
  type HighlightStyle,
  type HighlighterOptions,
  DEFAULT_HIGHLIGHT_STYLE,
  HIGHLIGHT_THEMES
} from './highlighter';

// 搜索建议
export {
  getSuggestions,
  recordSearch,
  clearSearchHistory,
  getRecentSearches,
  removeSearchHistory,
  getPopularSearches,
  type SearchSuggestion,
  type SuggestionOptions
} from './suggestions';

// 搜索历史
// 注意：./suggestions 与 ./search-history 各自提供同名便捷函数（基于不同的历史实现），
// 这里对 search-history 的版本做别名导出，避免模块顶层标识符重复。
export {
  SearchHistory,
  defaultSearchHistory,
  addSearch,
  getRecentSearches as getRecentSearchesFromHistory,
  clearSearchHistory as clearSearchHistoryFromHistory,
  removeSearch,
  getSearchHistoryStats,
  type SearchHistoryEntry,
  type SearchHistoryOptions
} from './search-history';
