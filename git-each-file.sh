#!/bin/bash

# Lấy danh sách file đã thay đổi (added, modified, deleted)
files=$(git status --porcelain | awk '{print $2}')

for file in $files; do
  echo "Processing $file..."

  # Add từng file
  git add "$file"

  # Commit với message theo tên file
  git commit -m "update: $file"

  # Push ngay sau mỗi commit (optional)
  git push origin $(git branch --show-current)

done

echo "Done!"
