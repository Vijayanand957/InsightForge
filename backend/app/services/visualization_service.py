import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
import io
import base64
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class VisualizationService:
    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()
        # Set style
        plt.style.use('seaborn-v0_8-darkgrid')
        sns.set_palette("husl")

    def generate_histogram(self, column: str, bins: int = 20) -> Dict[str, Any]:
        """Generate histogram for a numeric column and return base64 image + statistics."""
        if column not in self.df.columns:
            raise ValueError(f"Column '{column}' not found")
        if not pd.api.types.is_numeric_dtype(self.df[column]):
            raise ValueError(f"Column '{column}' is not numeric")

        data = self.df[column].dropna()
        fig, ax = plt.subplots(figsize=(8, 5))
        ax.hist(data, bins=bins, edgecolor='black', alpha=0.7, color='steelblue')
        ax.set_title(f'Distribution of {column}', fontsize=14)
        ax.set_xlabel(column)
        ax.set_ylabel('Frequency')
        ax.grid(True, alpha=0.3)

        # Convert plot to base64
        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)

        # Compute statistics
        stats = {
            'count': int(data.count()),
            'mean': float(data.mean()),
            'std': float(data.std()),
            'min': float(data.min()),
            '25%': float(data.quantile(0.25)),
            '50%': float(data.quantile(0.5)),
            '75%': float(data.quantile(0.75)),
            'max': float(data.max())
        }

        return {
            'chart_type': 'histogram',
            'image': img_base64,
            'column': column,
            'statistics': stats,
            'bins': bins
        }

    def generate_scatter(self, x_col: str, y_col: str, color_col: Optional[str] = None) -> Dict[str, Any]:
        """Generate scatter plot of two numeric columns."""
        for col in [x_col, y_col]:
            if col not in self.df.columns:
                raise ValueError(f"Column '{col}' not found")
            if not pd.api.types.is_numeric_dtype(self.df[col]):
                raise ValueError(f"Column '{col}' is not numeric")

        df_clean = self.df[[x_col, y_col] + ([color_col] if color_col else [])].dropna()
        fig, ax = plt.subplots(figsize=(8, 5))

        if color_col and color_col in self.df.columns:
            # Color by categorical column
            categories = df_clean[color_col].unique()
            for cat in categories:
                subset = df_clean[df_clean[color_col] == cat]
                ax.scatter(subset[x_col], subset[y_col], label=str(cat), alpha=0.6, s=30)
            ax.legend()
        else:
            ax.scatter(df_clean[x_col], df_clean[y_col], alpha=0.6, s=30, color='steelblue')

        ax.set_title(f'{y_col} vs {x_col}', fontsize=14)
        ax.set_xlabel(x_col)
        ax.set_ylabel(y_col)
        ax.grid(True, alpha=0.3)

        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)

        # Calculate correlation
        corr = df_clean[x_col].corr(df_clean[y_col])

        return {
            'chart_type': 'scatter',
            'image': img_base64,
            'x_column': x_col,
            'y_column': y_col,
            'color_column': color_col,
            'correlation': float(corr)
        }

    def generate_line_chart(self, x_col: str, y_col: str, agg: str = 'mean') -> Dict[str, Any]:
        """Generate line chart, optionally aggregating by x_col (e.g., time series)."""
        if x_col not in self.df.columns or y_col not in self.df.columns:
            raise ValueError("Columns not found")

        # Try to convert x_col to datetime if it looks like date
        try:
            self.df[x_col] = pd.to_datetime(self.df[x_col])
        except:
            pass

        # Aggregate if needed (for multiple points per x)
        if agg and pd.api.types.is_numeric_dtype(self.df[y_col]):
            df_agg = self.df.groupby(x_col, as_index=False)[y_col].agg(agg)
        else:
            df_agg = self.df[[x_col, y_col]].dropna()

        fig, ax = plt.subplots(figsize=(10, 5))
        ax.plot(df_agg[x_col], df_agg[y_col], marker='o', linestyle='-', color='steelblue')
        ax.set_title(f'{y_col} over {x_col}', fontsize=14)
        ax.set_xlabel(x_col)
        ax.set_ylabel(y_col)
        ax.grid(True, alpha=0.3)
        plt.xticks(rotation=45)

        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)

        return {
            'chart_type': 'line',
            'image': img_base64,
            'x_column': x_col,
            'y_column': y_col,
            'aggregation': agg
        }

    def generate_correlation_heatmap(self, columns: Optional[List[str]] = None) -> Dict[str, Any]:
        """Generate correlation heatmap for numeric columns."""
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns.tolist()
        if not numeric_cols:
            raise ValueError("No numeric columns to compute correlation")
        if columns:
            numeric_cols = [c for c in columns if c in numeric_cols]

        corr_matrix = self.df[numeric_cols].corr()

        fig, ax = plt.subplots(figsize=(max(6, len(numeric_cols)), max(5, len(numeric_cols))))
        sns.heatmap(corr_matrix, annot=True, fmt='.2f', cmap='coolwarm', ax=ax,
                    square=True, linewidths=0.5, cbar_kws={"shrink": 0.8})
        ax.set_title('Correlation Heatmap', fontsize=14)

        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)

        return {
            'chart_type': 'heatmap',
            'image': img_base64,
            'columns': numeric_cols,
            'correlation_matrix': corr_matrix.to_dict()
        }

    def generate_bar_chart(self, category_col: str, value_col: str, agg: str = 'sum') -> Dict[str, Any]:
        """Generate bar chart (aggregated values per category)."""
        if category_col not in self.df.columns or value_col not in self.df.columns:
            raise ValueError("Columns not found")

        df_agg = self.df.groupby(category_col, as_index=False)[value_col].agg(agg)
        df_agg = df_agg.sort_values(value_col, ascending=False).head(20)  # limit for readability

        fig, ax = plt.subplots(figsize=(10, 6))
        bars = ax.bar(range(len(df_agg)), df_agg[value_col], tick_label=df_agg[category_col])
        ax.set_title(f'{value_col} by {category_col}', fontsize=14)
        ax.set_xlabel(category_col)
        ax.set_ylabel(value_col)
        ax.grid(axis='y', alpha=0.3)
        plt.xticks(rotation=45, ha='right')

        # Add value labels on bars
        for bar in bars:
            height = bar.get_height()
            ax.annotate(f'{height:.1f}', xy=(bar.get_x() + bar.get_width()/2, height),
                        xytext=(0, 3), textcoords="offset points", ha='center', va='bottom', fontsize=8)

        buf = io.BytesIO()
        fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        plt.close(fig)

        return {
            'chart_type': 'bar',
            'image': img_base64,
            'category_column': category_col,
            'value_column': value_col,
            'aggregation': agg,
            'data': df_agg.to_dict(orient='records')
        }