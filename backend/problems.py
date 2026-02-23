"""
Static problem definitions with difficulty, marks, and time limits
"""

PROBLEMS = {
    # Python Problems
    "py_sum_n_numbers": {
        "id": "py_sum_n_numbers",
        "title": "Sum of N Numbers",
        "language": "python",
        "difficulty": "Easy",
        "marks": 10,
        "time_limit": 15,
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
            {"input": "5\n1 2 3 4 5", "output": "15"},
            {"input": "3\n10 20 30", "output": "60"},
            {"input": "1\n100", "output": "100"}
        ]
    },
    "py_fizz_buzz": {
        "id": "py_fizz_buzz",
        "title": "FizzBuzz",
        "language": "python",
        "difficulty": "Easy",
        "marks": 10,
        "time_limit": 15,
        "statement": """Write a program that prints numbers from 1 to N. But for multiples of 3, print "Fizz" instead of the number, and for multiples of 5, print "Buzz". For numbers which are multiples of both 3 and 5, print "FizzBuzz".

**Constraints:**
- 1 ≤ N ≤ 100""",
        "input_format": "A single integer N",
        "output_format": "Print the FizzBuzz sequence from 1 to N, each on a new line",
        "sample_input": "15",
        "sample_output": """1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz""",
        "starter_code": """n = int(input())

# Write your code here
""",
        "test_cases": [
            {"input": "5", "output": "1\n2\nFizz\n4\nBuzz"},
            {"input": "15", "output": "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz"},
            {"input": "3", "output": "1\n2\nFizz"}
        ]
    },
    "py_palindrome_check": {
        "id": "py_palindrome_check",
        "title": "Palindrome Check",
        "language": "python",
        "difficulty": "Medium",
        "marks": 20,
        "time_limit": 20,
        "statement": """Given a string, determine if it is a palindrome. Consider only alphanumeric characters and ignore case.

**Constraints:**
- 1 ≤ length of string ≤ 10^5
- String may contain spaces and special characters""",
        "input_format": "A single string",
        "output_format": "Print 'YES' if it's a palindrome, otherwise print 'NO'",
        "sample_input": "A man a plan a canal Panama",
        "sample_output": "YES",
        "starter_code": """s = input()

# Write your code here
""",
        "test_cases": [
            {"input": "A man a plan a canal Panama", "output": "YES"},
            {"input": "race a car", "output": "NO"},
            {"input": "Was it a car or a cat I saw", "output": "YES"},
            {"input": "hello", "output": "NO"}
        ]
    },
    "py_two_sum": {
        "id": "py_two_sum",
        "title": "Two Sum",
        "language": "python",
        "difficulty": "Medium",
        "marks": 20,
        "time_limit": 25,
        "statement": """Given an array of integers and a target sum, find two numbers such that they add up to the target. Print the indices (0-based) of the two numbers in ascending order.

**Constraints:**
- 2 ≤ N ≤ 10^4
- -10^9 ≤ each number ≤ 10^9
- Exactly one solution exists""",
        "input_format": """N target
a1 a2 a3 ... aN""",
        "output_format": "Two space-separated indices in ascending order",
        "sample_input": """4 9
2 7 11 15""",
        "sample_output": "0 1",
        "starter_code": """line1 = input().split()
n, target = int(line1[0]), int(line1[1])
arr = list(map(int, input().split()))

# Write your code here
""",
        "test_cases": [
            {"input": "4 9\n2 7 11 15", "output": "0 1"},
            {"input": "3 6\n3 2 4", "output": "1 2"},
            {"input": "2 6\n3 3", "output": "0 1"}
        ]
    },
    "py_longest_substring": {
        "id": "py_longest_substring",
        "title": "Longest Substring Without Repeating",
        "language": "python",
        "difficulty": "Hard",
        "marks": 30,
        "time_limit": 30,
        "statement": """Given a string, find the length of the longest substring without repeating characters.

**Constraints:**
- 0 ≤ length of string ≤ 5 * 10^4
- String consists of English letters, digits, symbols and spaces""",
        "input_format": "A single string",
        "output_format": "An integer representing the length of the longest substring",
        "sample_input": "abcabcbb",
        "sample_output": "3",
        "starter_code": """s = input()

# Write your code here
""",
        "test_cases": [
            {"input": "abcabcbb", "output": "3"},
            {"input": "bbbbb", "output": "1"},
            {"input": "pwwkew", "output": "3"},
            {"input": "", "output": "0"}
        ]
    },
    
    # SQL Problems
    "sql_employee_count": {
        "id": "sql_employee_count",
        "title": "Department-wise Employee Count",
        "language": "sql",
        "difficulty": "Easy",
        "marks": 10,
        "time_limit": 15,
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

**Note:** Write standard SQL only.""",
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
(1, 'Alice', 'HR', 50000),
(2, 'Bob', 'IT', 70000),
(3, 'Charlie', 'IT', 80000),
(4, 'Diana', 'HR', 55000);""",
        "test_cases": [
            {"expected_columns": ["department", "count"], "expected_rows": [["HR", 2], ["IT", 2]]}
        ]
    },
    "sql_max_salary": {
        "id": "sql_max_salary",
        "title": "Maximum Salary per Department",
        "language": "sql",
        "difficulty": "Easy",
        "marks": 10,
        "time_limit": 15,
        "statement": """Write a query to find the maximum salary in each department.

**Table Schema:**
```sql
CREATE TABLE employees (
  id INTEGER,
  name TEXT,
  department TEXT,
  salary INTEGER
);
```""",
        "input_format": "Use the predefined `employees` table.",
        "output_format": "Return department and max_salary columns.",
        "sample_input": "N/A",
        "sample_output": """department | max_salary
HR         | 55000
IT         | 80000""",
        "starter_code": """-- Write your SQL query here
SELECT department, MAX(salary) AS max_salary
FROM employees
GROUP BY department;""",
        "schema_sql": """CREATE TABLE employees (
  id INTEGER,
  name TEXT,
  department TEXT,
  salary INTEGER
);""",
        "seed_sql": """INSERT INTO employees VALUES
(1, 'Alice', 'HR', 50000),
(2, 'Bob', 'IT', 70000),
(3, 'Charlie', 'IT', 80000),
(4, 'Diana', 'HR', 55000);""",
        "test_cases": [
            {"expected_columns": ["department", "max_salary"], "expected_rows": [["HR", 55000], ["IT", 80000]]}
        ]
    },
    "sql_second_highest": {
        "id": "sql_second_highest",
        "title": "Second Highest Salary",
        "language": "sql",
        "difficulty": "Medium",
        "marks": 20,
        "time_limit": 20,
        "statement": """Write a SQL query to find the second highest salary from the employees table. If there is no second highest salary, return NULL.

**Table Schema:**
```sql
CREATE TABLE employees (
  id INTEGER,
  name TEXT,
  department TEXT,
  salary INTEGER
);
```""",
        "input_format": "Use the predefined `employees` table.",
        "output_format": "Return a single column: second_highest_salary",
        "sample_input": "N/A",
        "sample_output": """second_highest_salary
70000""",
        "starter_code": """-- Write your SQL query here
SELECT MAX(salary) AS second_highest_salary
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);""",
        "schema_sql": """CREATE TABLE employees (
  id INTEGER,
  name TEXT,
  department TEXT,
  salary INTEGER
);""",
        "seed_sql": """INSERT INTO employees VALUES
(1, 'Alice', 'HR', 50000),
(2, 'Bob', 'IT', 70000),
(3, 'Charlie', 'IT', 80000),
(4, 'Diana', 'HR', 55000);""",
        "test_cases": [
            {"expected_columns": ["second_highest_salary"], "expected_rows": [[70000]]}
        ]
    },
    "sql_above_avg_salary": {
        "id": "sql_above_avg_salary",
        "title": "Employees Above Average Salary",
        "language": "sql",
        "difficulty": "Medium",
        "marks": 20,
        "time_limit": 25,
        "statement": """Write a query to find all employees whose salary is above the average salary of all employees. Return the name and salary.

**Table Schema:**
```sql
CREATE TABLE employees (
  id INTEGER,
  name TEXT,
  department TEXT,
  salary INTEGER
);
```""",
        "input_format": "Use the predefined `employees` table.",
        "output_format": "Return name and salary columns, ordered by salary descending.",
        "sample_input": "N/A",
        "sample_output": """name    | salary
Charlie | 80000
Bob     | 70000""",
        "starter_code": """-- Write your SQL query here
SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees)
ORDER BY salary DESC;""",
        "schema_sql": """CREATE TABLE employees (
  id INTEGER,
  name TEXT,
  department TEXT,
  salary INTEGER
);""",
        "seed_sql": """INSERT INTO employees VALUES
(1, 'Alice', 'HR', 50000),
(2, 'Bob', 'IT', 70000),
(3, 'Charlie', 'IT', 80000),
(4, 'Diana', 'HR', 55000);""",
        "test_cases": [
            {"expected_columns": ["name", "salary"], "expected_rows": [["Charlie", 80000], ["Bob", 70000]]}
        ]
    },
    "sql_dept_ranking": {
        "id": "sql_dept_ranking",
        "title": "Department Salary Ranking",
        "language": "sql",
        "difficulty": "Hard",
        "marks": 30,
        "time_limit": 30,
        "statement": """Write a query to rank employees within each department by salary (highest first). Return name, department, salary, and rank.

**Table Schema:**
```sql
CREATE TABLE employees (
  id INTEGER,
  name TEXT,
  department TEXT,
  salary INTEGER
);
```

**Note:** Use window functions if available, or subqueries for ranking.""",
        "input_format": "Use the predefined `employees` table.",
        "output_format": "Return name, department, salary, and salary_rank columns.",
        "sample_input": "N/A",
        "sample_output": """name    | department | salary | salary_rank
Diana   | HR         | 55000  | 1
Alice   | HR         | 50000  | 2
Charlie | IT         | 80000  | 1
Bob     | IT         | 70000  | 2""",
        "starter_code": """-- Write your SQL query here
SELECT name, department, salary,
       RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS salary_rank
FROM employees
ORDER BY department, salary_rank;""",
        "schema_sql": """CREATE TABLE employees (
  id INTEGER,
  name TEXT,
  department TEXT,
  salary INTEGER
);""",
        "seed_sql": """INSERT INTO employees VALUES
(1, 'Alice', 'HR', 50000),
(2, 'Bob', 'IT', 70000),
(3, 'Charlie', 'IT', 80000),
(4, 'Diana', 'HR', 55000);""",
        "test_cases": [
            {"expected_columns": ["name", "department", "salary", "salary_rank"], 
             "expected_rows": [["Diana", "HR", 55000, 1], ["Alice", "HR", 50000, 2], ["Charlie", "IT", 80000, 1], ["Bob", "IT", 70000, 2]]}
        ]
    }
}

def get_problem(problem_id: str):
    """Get problem by ID"""
    return PROBLEMS.get(problem_id)

def list_problems():
    """List all available problems with metadata"""
    return [
        {
            "id": p["id"],
            "title": p["title"],
            "language": p["language"],
            "difficulty": p.get("difficulty", "Medium"),
            "marks": p.get("marks", 10),
            "time_limit": p.get("time_limit", 15)
        }
        for p in PROBLEMS.values()
    ]

def list_problems_by_language(language: str):
    """List problems filtered by language"""
    return [
        {
            "id": p["id"],
            "title": p["title"],
            "language": p["language"],
            "difficulty": p.get("difficulty", "Medium"),
            "marks": p.get("marks", 10),
            "time_limit": p.get("time_limit", 15)
        }
        for p in PROBLEMS.values()
        if p["language"] == language
    ]

def get_exam_summary():
    """Get exam summary with total marks and time"""
    problems = list(PROBLEMS.values())
    python_problems = [p for p in problems if p["language"] == "python"]
    sql_problems = [p for p in problems if p["language"] == "sql"]
    
    return {
        "total_duration_minutes": 120,  # 2 hours
        "total_questions": len(problems),
        "python_questions": len(python_problems),
        "sql_questions": len(sql_problems),
        "total_marks": sum(p.get("marks", 10) for p in problems),
        "problems": [
            {
                "id": p["id"],
                "title": p["title"],
                "language": p["language"],
                "difficulty": p.get("difficulty", "Medium"),
                "marks": p.get("marks", 10),
                "time_limit": p.get("time_limit", 15)
            }
            for p in problems
        ]
    }
