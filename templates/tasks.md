# Tasks — {{feature}}

> Sequence matters. Data/schema tasks before logic tasks before UI tasks.
> Flag any dependency inversion explicitly (e.g. do not schedule model/logic work
> before its data source task is complete).

| Task ID | Task | Depends On | Layer | Est. (man-day) | Status |
| ------ | ------ | ------ | ------ | ------ | ------ |
| {{feature}}-01 | [TODO] | - | data | - | todo |
| {{feature}}-02 | [TODO] | {{feature}}-01 | logic | - | todo |
| {{feature}}-03 | [TODO] | {{feature}}-02 | ui | - | todo |
