export interface AppConfig {
  /** Maximum file size in MB */
  maxFileSizeMB: number;
  /** Maximum data rows allowed (excluding header) */
  maxRows: number;
  /** Maximum columns allowed in CSV */
  maxColumns: number;
}

declare global {
  interface Window {
    APP_CONFIG?: Partial<AppConfig>;
  }
}

export const DEFAULT_CONFIG: AppConfig = {
  maxFileSizeMB: 10,
  maxRows: 5000,
  maxColumns: 50,
};

export const getAppConfig = (): AppConfig => {
  if (typeof window !== 'undefined' && window.APP_CONFIG) {
    const custom = window.APP_CONFIG;
    return {
      maxFileSizeMB:
        typeof custom.maxFileSizeMB === 'number' && custom.maxFileSizeMB > 0
          ? custom.maxFileSizeMB
          : DEFAULT_CONFIG.maxFileSizeMB,
      maxRows:
        typeof custom.maxRows === 'number' && custom.maxRows > 0
          ? custom.maxRows
          : DEFAULT_CONFIG.maxRows,
      maxColumns:
        typeof custom.maxColumns === 'number' && custom.maxColumns > 0
          ? custom.maxColumns
          : DEFAULT_CONFIG.maxColumns,
    };
  }
  return DEFAULT_CONFIG;
};
