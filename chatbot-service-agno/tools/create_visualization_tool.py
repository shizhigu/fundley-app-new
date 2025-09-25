"""
Simple Visualization Tool - Create Chart.js visualizations
Agent specifies exactly what goes on X/Y axis - no complex auto-detection
"""

import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)



async def create_visualization(
    title: str,
    data: List[Dict[str, Any]],
    chart_type: str,
    x_axis: str,
    y_axis: str,
    series_field: Optional[str] = None,
    description: Optional[str] = None
) -> str:
    """
    Create simple Chart.js visualizations.

    Agent decides exactly what field goes on X and Y axis.
    No complex auto-detection or alignment - just simple data mapping.

    ⚠️ CRITICAL: TIME-BASED DATA ORDERING ⚠️
    For time-based visualizations (trends, historical analysis):
    1. Query data with ORDER BY clauses to ensure chronological order
    2. Data must be sorted BEFORE passing to this tool
    3. Chart will display X-axis labels in the exact order received from data

    IMPORTANT X-AXIS FIELD SELECTION:
    ✅ PREFER: Human-readable labels like "period", "fiscalYear", "quarter"
    ❌ AVOID: Raw timestamp fields like "date", "reportedDate", "calendarYear"

    Good X-axis fields: "period" (e.g., "Q1 2024"), "fiscalYear" (e.g., "2024"), "quarter" (e.g., "Q1")
    Bad X-axis fields: "date" (e.g., "2020-09-26T00:00:00"), "reportedDate", "timestamp"

    TIME ORDERING EXAMPLES:
    ✅ CORRECT: Query with "ORDER BY date ASC" → ["Q1 2024", "Q2 2024", "Q3 2024", "Q4 2024"]
    ❌ WRONG: Unordered query → ["Q3 2025", "Q2 2024", "Q1 2024", "Q4 2024"] (chaotic timeline)

    Args:
        title: Chart title
        data: Array of data objects
        chart_type: "bar", "line", "pie", "doughnut", "scatter", "radar"
        x_axis: Field name for X-axis - CHOOSE READABLE LABELS, NOT RAW TIMESTAMPS
        y_axis: Field name for Y-axis (e.g., "roce_value", "revenue")
        series_field: Optional field to group multiple series (e.g., "symbol")
        description: Optional description

    Examples:
        # ✅ GOOD: Using "period" field for readable X-axis
        create_visualization(
            title="Apple Revenue Growth",
            data=[{"period": "Q1 2024", "revenue": 100}, {"period": "Q2 2024", "revenue": 120}],
            chart_type="line",
            x_axis="period",  # Human-readable quarters
            y_axis="revenue"
        )

        # ✅ GOOD: Multi-company with "fiscalYear" field
        create_visualization(
            title="ROCE Comparison",
            data=[
                {"symbol": "AAPL", "fiscalYear": 2024, "roce_value": 15.2},
                {"symbol": "NVDA", "fiscalYear": 2024, "roce_value": 18.5}
            ],
            chart_type="bar",
            x_axis="fiscalYear",  # Clean year labels like "2024"
            y_axis="roce_value",
            series_field="symbol"
        )

        # ❌ BAD: Never use raw timestamp fields for X-axis
        # DON'T DO: x_axis="date" when date="2020-09-26T00:00:00"
    """
    try:
        print(f"🎨 SIMPLE CREATE_VISUALIZATION: {title}")
        print(f"📊 Chart: {chart_type}, X: {x_axis}, Y: {y_axis}, Series: {series_field}")
        print(f"📄 Data points: {len(data)}")

        # Validate input
        if not data:
            return json.dumps({"error": "No data provided"})

        valid_types = ['bar', 'line', 'pie', 'doughnut', 'scatter', 'radar']
        if chart_type not in valid_types:
            return json.dumps({"error": f"Invalid chart_type. Must be one of: {valid_types}"})

        # Check if required fields exist in data
        sample = data[0] if data else {}
        if x_axis not in sample:
            return json.dumps({"error": f"X-axis field '{x_axis}' not found in data"})
        if y_axis not in sample:
            return json.dumps({"error": f"Y-axis field '{y_axis}' not found in data"})
        if series_field and series_field not in sample:
            return json.dumps({"error": f"Series field '{series_field}' not found in data"})

        # Clean data - remove items with missing required fields
        clean_data = []
        for item in data:
            if (x_axis in item and item[x_axis] is not None and
                y_axis in item and item[y_axis] is not None):
                # If series_field is specified, it must also exist
                if not series_field or (series_field in item and item[series_field] is not None):
                    clean_data.append(item)

        print(f"✅ Clean data: {len(clean_data)} points (removed {len(data) - len(clean_data)} incomplete)")

        if not clean_data:
            return json.dumps({"error": "No valid data points after cleaning"})

        # Generate complete Chart.js configuration

        # Extract unique labels (X-axis values)
        labels = []
        for item in clean_data:
            label = str(item[x_axis])
            if label not in labels:
                labels.append(label)

        # Generate datasets
        datasets = []
        if series_field:
            # Multi-series data
            series_values = list(set(str(item[series_field]) for item in clean_data))
            colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f']

            for i, series in enumerate(series_values):
                series_data = []
                for label in labels:
                    # Find matching data point
                    value = 0
                    for item in clean_data:
                        if str(item[x_axis]) == label and str(item[series_field]) == series:
                            value = float(item[y_axis]) if item[y_axis] is not None else 0
                            break
                    series_data.append(value)

                datasets.append({
                    "label": series,
                    "data": series_data,
                    "borderColor": colors[i % len(colors)],
                    "backgroundColor": colors[i % len(colors)] + "20" if chart_type in ['bar', 'pie', 'doughnut'] else colors[i % len(colors)],
                    "tension": 0.1 if chart_type == 'line' else None
                })
        else:
            # Single series data
            data_values = []
            for label in labels:
                value = 0
                for item in clean_data:
                    if str(item[x_axis]) == label:
                        value = float(item[y_axis]) if item[y_axis] is not None else 0
                        break
                data_values.append(value)

            datasets.append({
                "label": title,
                "data": data_values,
                "borderColor": '#1f77b4',
                "backgroundColor": '#1f77b420' if chart_type in ['bar', 'pie', 'doughnut'] else '#1f77b4',
                "tension": 0.1 if chart_type == 'line' else None
            })

        # Complete Chart.js configuration
        visualization_config = {
            "type": "frontend_visualization",
            "title": title,
            "description": description or f"{chart_type.title()} chart showing {y_axis} by {x_axis}",
            "chartjsConfig": {
                "type": chart_type,
                "data": {
                    "labels": labels,
                    "datasets": datasets
                },
                "options": {
                    "responsive": True,
                    "maintainAspectRatio": False,
                    "plugins": {
                        "title": {
                            "display": True,
                            "text": title,
                            "font": {
                                "size": 16,
                                "weight": "bold"
                            }
                        },
                        "legend": {
                            "display": len(datasets) > 1 or series_field is not None
                        }
                    },
                    "scales": {
                        "x": {
                            "display": True,
                            "title": {
                                "display": True,
                                "text": x_axis
                            }
                        },
                        "y": {
                            "display": True,
                            "title": {
                                "display": True,
                                "text": y_axis
                            }
                        }
                    } if chart_type not in ['pie', 'doughnut'] else {}
                }
            },
            "metadata": {
                "library": "chart-js",
                "dataPoints": len(clean_data),
                "renderTime": "< 1 second",
                "generatedAt": datetime.now().isoformat(),
                "approach": "complete_chartjs_config"
            }
        }

        result = json.dumps(visualization_config, ensure_ascii=False, indent=2)
        print(f"✅ Generated simple visualization config: {len(result)} characters")
        return result

    except Exception as e:
        logger.error(f"❌ Simple visualization error: {e}")
        return json.dumps({"error": f"Visualization failed: {str(e)}"})