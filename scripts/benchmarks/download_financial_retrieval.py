#!/usr/bin/env python3
"""
Download financial-retrieval dataset from Hugging Face

Usage:
    python download_financial_retrieval.py [--split train|test|all] [--output-dir ./data]

Requirements:
    pip install pandas huggingface-hub

Authentication:
    Login first using: huggingface-cli login
"""

import argparse
import os
from pathlib import Path
import pandas as pd


def download_dataset(split: str = 'train', output_dir: str = './data'):
    """
    Download financial-retrieval dataset from Hugging Face

    Args:
        split: Dataset split to download ('train', 'test', or 'all')
        output_dir: Directory to save the downloaded data
    """
    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    print(f"📦 Downloading financial-retrieval dataset...")
    print(f"   Split: {split}")
    print(f"   Output: {output_path.absolute()}")

    try:
        if split == 'all':
            splits = ['train', 'test']
        else:
            splits = [split]

        for current_split in splits:
            print(f"\n🔄 Downloading {current_split} split...")

            # Download from Hugging Face
            df = pd.read_csv(f"hf://datasets/daloopa/financial-retrieval/{current_split}.csv")

            # Save to local file
            output_file = output_path / f"{current_split}.csv"
            df.to_csv(output_file, index=False)

            print(f"✅ Saved {current_split} split to: {output_file}")
            print(f"   Records: {len(df):,}")
            print(f"   Columns: {', '.join(df.columns.tolist())}")
            print(f"   Size: {output_file.stat().st_size / 1024 / 1024:.2f} MB")

            # Show sample
            print(f"\n📊 Sample data from {current_split} split:")
            print(df.head(3).to_string())
            print()

        print("✅ Download complete!")

    except Exception as e:
        print(f"❌ Error downloading dataset: {e}")
        print("\n💡 Make sure you're logged in to Hugging Face:")
        print("   huggingface-cli login")
        raise


def main():
    parser = argparse.ArgumentParser(
        description="Download financial-retrieval dataset from Hugging Face"
    )
    parser.add_argument(
        '--split',
        type=str,
        choices=['train', 'test', 'all'],
        default='train',
        help='Dataset split to download (default: train)'
    )
    parser.add_argument(
        '--output-dir',
        type=str,
        default='./data',
        help='Output directory for downloaded data (default: ./data)'
    )

    args = parser.parse_args()

    download_dataset(split=args.split, output_dir=args.output_dir)


if __name__ == '__main__':
    main()
