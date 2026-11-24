import type { ReactNode } from "react";
import { View } from "react-native";

interface ResponsiveGridProps<T> {
  items: readonly T[];
  /** Number of columns (computed by the caller from the window width). */
  columns: number;
  keyOf: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  /** Gap between rows/columns in px (default 12 = mockup `gap: 9–16`). */
  gap?: number;
  testID?: string;
}

/**
 * Column grid for RN (no CSS grid): chunks items into row views; every cell
 * stretches equally (`flex: 1`). With one column items stack vertically.
 * Used by the Stammdaten overview (4 → 2 → 1) and the two-column lists.
 */
export function ResponsiveGrid<T>({
  items,
  columns,
  keyOf,
  renderItem,
  gap = 12,
  testID,
}: ResponsiveGridProps<T>) {
  const columnCount = Math.max(1, Math.floor(columns));

  if (columnCount === 1) {
    return (
      <View testID={testID} style={{ gap }}>
        {items.map((item, index) => (
          <View key={keyOf(item, index)}>{renderItem(item, index)}</View>
        ))}
      </View>
    );
  }

  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columnCount) {
    rows.push(items.slice(index, index + columnCount));
  }

  return (
    <View testID={testID} style={{ gap }}>
      {rows.map((row, rowIndex) => (
        <View
          key={`row-${rowIndex}`}
          style={{ flexDirection: "row", gap, alignItems: "stretch" }}
          testID={testID ? `${testID}-row-${rowIndex}` : undefined}
        >
          {row.map((item, index) => (
            <View key={keyOf(item, index)} style={{ flex: 1 }}>
              {renderItem(item, index)}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
