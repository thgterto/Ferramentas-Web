import pandas as pd
import numpy as np
from fastapi import HTTPException
import io
import re

class ExcelProcessor:
    @staticmethod
    def process_file(content: bytes, filename: str) -> pd.DataFrame:
        """
        Reads a file content (Excel or CSV) into a pandas DataFrame.
        Performs basic cleaning:
        - Normalizes column names (lowercase, no spaces)
        - Replaces NaN and Infinity with None (for JSON serialization)
        """
        file_ext = filename.split('.')[-1].lower()

        try:
            if file_ext == 'csv':
                df = pd.read_csv(io.BytesIO(content))
            elif file_ext in ['xlsx', 'xls']:
                df = pd.read_excel(io.BytesIO(content))
            else:
                raise HTTPException(status_code=400, detail="Invalid file format. Only .csv, .xlsx, .xls are supported.")
        except Exception as e:
            # Need to bubble up exception as HTTPException or catch in endpoint
            raise e

        # Clean Column Names
        # Replace spaces with underscores, remove special chars, lowercase
        df.columns = [
            re.sub(r'[^a-zA-Z0-9_]', '', str(col).strip().replace(' ', '_').lower())
            for col in df.columns
        ]

        # Replace Infinity with NaN first, then NaN with None
        df = df.replace([np.inf, -np.inf], np.nan)
        df = df.where(pd.notnull(df), None)

        return df

    @staticmethod
    def get_metadata(df: pd.DataFrame) -> dict:
        """
        Extracts metadata from the DataFrame.
        """
        return {
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": list(df.columns)
        }
