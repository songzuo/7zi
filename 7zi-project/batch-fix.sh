#!/bin/bash

cd /root/.openclaw/workspace/7zi-project

# 修复 lru-cache.test.ts 中的 null 类型问题
sed -i "s/set('key', null)/set('key', null as string)/g" src/lib/cache/__tests__/lru-cache.test.ts

# 修复 form-validator.test.ts 中的类型问题 - 需要添加 age 字段
sed -i 's/{ name: string; email: string; }/{ name: string; age: number; email: string; }/g' src/lib/validation/__tests__/form-validator.test.ts

echo "Batch fixes applied"
