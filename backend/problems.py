"""
Static problem definitions
Future: extend with language field for SQL support
"""

PROBLEMS = {
    "sum_n_numbers": {
        "id": "sum_n_numbers",
        "title": "Sum of N Numbers",
        "language": "python",
        "statement": """Given an integer **N**, followed by **N space-separated integers**, print their sum.

**Constraints:**
- 1 ≤ N ≤ 1000
- -10^6 ≤ each number ≤ 10^6""",
        "input_format": """N
a1 a2 a3 ... aN""",
        "output_format": "Sum of the numbers",
        "sample_input": """5
1 2 3 4 5""",
        "sample_output": "15",
        "starter_code": """n = int(input())
arr = list(map(int, input().split()))

# Write your code here
""",
        "test_cases": [
            {
                "input": "5\n1 2 3 4 5",
                "output": "15"
            },
            {
                "input": "3\n10 20 30",
                "output": "60"
            },
            {
                "input": "1\n100",
                "output": "100"
            }
        ]
    },
    "sql_department_employee_count": {
        "id": "sql_department_employee_count",
        "title": "Department-wise Employee Count",
        "language": "sql",
        "statement": """Given an `employees` table, write a query to find the number of employees in each department.

**Table Schema:**

```sql
CREATE TABLE employees (
  id INTEGER,
  name TEXT,
  department TEXT,
  salary INTEGER
);
```

**Seed Data:**

```sql
INSERT INTO employees VALUES
(1, 'A', 'HR', 50000),
(2, 'B', 'IT', 70000),
(3, 'C', 'IT', 80000),
(4, 'D', 'HR', 55000);
```

**Expected Output:**

| department | count |
| ---------- | ----- |
| HR         | 2     |
| IT         | 2     |

**Note:** Write standard SQL only. Database-specific syntax (PostgreSQL / MySQL features) is not supported.""",
        "input_format": "Use the predefined `employees` table.",
        "output_format": "Return two columns: department and count.",
        "sample_input": "N/A (Schema and seed data are provided)",
        "sample_output": """department | count
HR         | 2
IT         | 2""",
        "starter_code": """SELECT department, COUNT(*) AS count
FROM employees
GROUP BY department;""",
        "schema_sql": """CREATE TABLE employees (
  id INTEGER,
  name TEXT,
  department TEXT,
  salary INTEGER
);""",
        "seed_sql": """INSERT INTO employees VALUES
(1, 'A', 'HR', 50000),
(2, 'B', 'IT', 70000),
(3, 'C', 'IT', 80000),
(4, 'D', 'HR', 55000);""",
        "test_cases": [
            {
                "expected_columns": ["department", "count"],
                "expected_rows": [
                    ["HR", 2],
                    ["IT", 2]
                ]
            }
        ]
    }
}

def get_problem(problem_id: str):
    """Get problem by ID"""
    return PROBLEMS.get(problem_id)

def list_problems():
    """List all available problems"""
    return [
        {
            "id": p["id"],
            "title": p["title"],
            "language": p["language"]
        }
        for p in PROBLEMS.values()
    ]
