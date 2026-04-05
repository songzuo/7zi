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
export {
  SearchHistory,
  defaultSearchHistory,
  addSearch,
  getRecentSearches,
  clearSearchHistory,
  removeSearch,
  getSearchHistoryStats,
  type SearchHistoryEntry,
  type SearchHistoryOptions
} from './search-history';
