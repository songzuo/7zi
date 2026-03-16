#!/bin/bash
# checkpoint.sh - 断点续传管理工具
# 用法: checkpoint.sh <command> [args]
#   start <task_id> <description> [steps_json]  - 开始任务
#   step <task_id> <step_name> <status>         - 更新步骤状态
#   progress <task_id> <message>                - 记录进度
#   complete <task_id>                          - 完成任务
#   fail <task_id> <reason>                     - 标记失败
#   status                                      - 查看当前状态
#   pending                                     - 查看未完成任务
#   history [n]                                 - 最近n个已完成任务

CHECKPOINT_FILE="/root/.openclaw/workspace/state/checkpoint.json"
CHECKPOINT_DIR="/root/.openclaw/workspace/state"

mkdir -p "$CHECKPOINT_DIR"

# 确保checkpoint文件存在
if [ ! -f "$CHECKPOINT_FILE" ]; then
  echo '{"version":1,"active_task":null,"completed_tasks":[],"last_updated":null}' > "$CHECKPOINT_FILE"
fi

CMD="$1"
shift

case "$CMD" in
  start)
    TASK_ID="$1"
    DESC="$2"
    STEPS="$3"
    NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    if [ -z "$STEPS" ]; then
      STEPS="[]"
    fi
    
    python3 -c "
import json,sys
with open('$CHECKPOINT_FILE') as f: data=json.load(f)
task={
  'id': '$TASK_ID',
  'description': '''$DESC''',
  'status': 'running',
  'started_at': '$NOW',
  'updated_at': '$NOW',
  'steps': $STEPS,
  'progress_log': [],
  'context': {}
}
# 如果有活跃任务，先归档
if data.get('active_task'):
  old = data['active_task']
  old['status'] = 'interrupted'
  old['interrupted_at'] = '$NOW'
  data.setdefault('interrupted_tasks',[]).append(old)
data['active_task'] = task
data['last_updated'] = '$NOW'
with open('$CHECKPOINT_FILE','w') as f: json.dump(data,f,indent=2,ensure_ascii=False)
print(f'✅ 任务已启动: {task[\"id\"]}')
"
    ;;

  step)
    TASK_ID="$1"
    STEP_NAME="$2"
    STATUS="$3"
    NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    python3 -c "
import json
with open('$CHECKPOINT_FILE') as f: data=json.load(f)
task = data.get('active_task')
if not task or task['id'] != '$TASK_ID':
  print('❌ 任务不匹配'); exit(1)
found = False
for s in task.get('steps',[]):
  if s['name'] == '$STEP_NAME':
    s['status'] = '$STATUS'
    s['updated_at'] = '$NOW'
    found = True
    break
if not found:
  task['steps'].append({'name':'$STEP_NAME','status':'$STATUS','updated_at':'$NOW'})
task['updated_at'] = '$NOW'
data['last_updated'] = '$NOW'
with open('$CHECKPOINT_FILE','w') as f: json.dump(data,f,indent=2,ensure_ascii=False)
print(f'✅ 步骤更新: $STEP_NAME → $STATUS')
"
    ;;

  progress)
    TASK_ID="$1"
    MSG="$2"
    NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    python3 -c "
import json
with open('$CHECKPOINT_FILE') as f: data=json.load(f)
task = data.get('active_task')
if not task or task['id'] != '$TASK_ID':
  print('❌ 任务不匹配'); exit(1)
task['progress_log'].append({'time':'$NOW','msg':'''$MSG'''})
# 只保留最近20条
task['progress_log'] = task['progress_log'][-20:]
task['updated_at'] = '$NOW'
data['last_updated'] = '$NOW'
with open('$CHECKPOINT_FILE','w') as f: json.dump(data,f,indent=2,ensure_ascii=False)
print(f'📝 进度记录: $MSG')
"
    ;;

  complete)
    TASK_ID="$1"
    NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    python3 -c "
import json
with open('$CHECKPOINT_FILE') as f: data=json.load(f)
task = data.get('active_task')
if not task or task['id'] != '$TASK_ID':
  print('❌ 任务不匹配'); exit(1)
task['status'] = 'completed'
task['completed_at'] = '$NOW'
data['completed_tasks'].append(task)
data['completed_tasks'] = data['completed_tasks'][-50:]
data['active_task'] = None
data['last_updated'] = '$NOW'
with open('$CHECKPOINT_FILE','w') as f: json.dump(data,f,indent=2,ensure_ascii=False)
print(f'✅ 任务完成: $TASK_ID')
"
    ;;

  fail)
    TASK_ID="$1"
    REASON="$2"
    NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    python3 -c "
import json
with open('$CHECKPOINT_FILE') as f: data=json.load(f)
task = data.get('active_task')
if not task or task['id'] != '$TASK_ID':
  print('❌ 任务不匹配'); exit(1)
task['status'] = 'failed'
task['failed_at'] = '$NOW'
task['fail_reason'] = '''$REASON'''
data.setdefault('interrupted_tasks',[]).append(task)
data['active_task'] = None
data['last_updated'] = '$NOW'
with open('$CHECKPOINT_FILE','w') as f: json.dump(data,f,indent=2,ensure_ascii=False)
print(f'❌ 任务失败: $TASK_ID - $REASON')
"
    ;;

  status)
    python3 -c "
import json
with open('$CHECKPOINT_FILE') as f: data=json.load(f)
task = data.get('active_task')
if task:
  print(f'🔄 活跃任务: {task[\"id\"]}')
  print(f'   描述: {task[\"description\"]}')
  print(f'   状态: {task[\"status\"]}')
  print(f'   开始: {task[\"started_at\"]}')
  print(f'   更新: {task[\"updated_at\"]}')
  steps = task.get('steps',[])
  if steps:
    print(f'   步骤:')
    for s in steps:
      icon = '✅' if s['status']=='done' else '🔄' if s['status']=='running' else '⏳'
      print(f'     {icon} {s[\"name\"]}: {s[\"status\"]}')
  logs = task.get('progress_log',[])
  if logs:
    print(f'   最近进度:')
    for l in logs[-3:]:
      print(f'     [{l[\"time\"]}] {l[\"msg\"]}')
else:
  print('✅ 无活跃任务')
interrupted = data.get('interrupted_tasks',[])
if interrupted:
  print(f'⚠️ {len(interrupted)}个中断任务待恢复')
  for t in interrupted[-3:]:
    print(f'   - {t[\"id\"]}: {t[\"description\"][:60]}')
"
    ;;

  pending)
    python3 -c "
import json
with open('$CHECKPOINT_FILE') as f: data=json.load(f)
tasks = []
if data.get('active_task') and data['active_task']['status'] in ('running','interrupted'):
  tasks.append(data['active_task'])
for t in data.get('interrupted_tasks',[]):
  if t['status'] == 'interrupted':
    tasks.append(t)
if not tasks:
  print('✅ 无待恢复任务')
else:
  print(f'⚠️ {len(tasks)}个任务需要恢复:')
  for t in tasks:
    print(json.dumps(t, indent=2, ensure_ascii=False))
"
    ;;

  history)
    N="${1:-5}"
    python3 -c "
import json
with open('$CHECKPOINT_FILE') as f: data=json.load(f)
tasks = data.get('completed_tasks',[])[-$N:]
if not tasks:
  print('无历史记录')
else:
  for t in tasks:
    print(f'✅ {t[\"id\"]}: {t[\"description\"][:60]} ({t.get(\"completed_at\",\"?\")})')
"
    ;;

  *)
    echo "用法: checkpoint.sh <start|step|progress|complete|fail|status|pending|history> [args]"
    ;;
esac
