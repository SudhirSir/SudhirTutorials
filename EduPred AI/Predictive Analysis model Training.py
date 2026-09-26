import pandas as pd
import matplotlib.pyplot as plt

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder, PolynomialFeatures
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.cluster import KMeans
from sklearn.metrics import accuracy_score, mean_absolute_error, confusion_matrix


df = pd.read_excel("C:\\Users\\Sushil\\OneDrive\\Documents\\Desktop\\Vth Sem Material\\Student_Flask_App\\Stians Record 21-25.xlsx")

df.columns = (
    df.columns.str.strip().str.lower()
    .str.replace(" ", "_")
    .str.replace("%", "percent")
)

df["doj"] = pd.to_datetime(df["doj"], errors="coerce", dayfirst=True)

num_cols = [
    "science_marks", "maths_marks", "previous_year_marks",
    "attendance_percent", "homework_percent", "class_tests_attended"
]

for col in num_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce")
    df[col] = df[col].fillna(df[col].mean())

le = LabelEncoder()
for col in ["gender", "batch", "subjects"]:
    df[col] = le.fit_transform(df[col].astype(str))

df["average_marks"] = (
    df["science_marks"] +
    df["maths_marks"] +
    df["previous_year_marks"]
) / 3

def performance(row):
    if row["average_marks"] >= 75 and row["attendance_percent"] >= 85:
        return 2
    elif row["average_marks"] >= 50:
        return 1
    else:
        return 0

df["performance_level"] = df.apply(performance, axis=1)

plt.figure()
plt.hist(df["average_marks"], bins=10)
plt.title("Distribution of Average Marks")
plt.xlabel("Average Marks")
plt.ylabel("Number of Students")
plt.show()

plt.figure()
plt.scatter(df["attendance_percent"], df["average_marks"])
plt.title("Attendance vs Average Marks")
plt.xlabel("Attendance (%)")
plt.ylabel("Average Marks")
plt.show()

plt.figure()
plt.boxplot(
    [df["science_marks"], df["maths_marks"]],
    labels=["Science", "Maths"]
)
plt.title("Science vs Maths Marks Comparison")
plt.ylabel("Marks")
plt.show()

labels = ["Weak", "Average", "Good"]
counts = df["performance_level"].value_counts().sort_index()

plt.figure()
plt.bar(labels, counts)
plt.title("Student Performance Levels")
plt.xlabel("Performance")
plt.ylabel("Number of Students")
plt.show()

reg_features = [
    "science_marks", "maths_marks",
    "attendance_percent", "homework_percent",
    "class_tests_attended"
]

clf_features = [
    "science_marks", "maths_marks",
    "previous_year_marks", "attendance_percent",
    "homework_percent", "class_tests_attended"
]

X_reg = df[reg_features]
y_reg = df["average_marks"]

X_clf = df[clf_features]
y_clf = df["performance_level"]

Xr_tr, Xr_te, yr_tr, yr_te = train_test_split(
    X_reg, y_reg, test_size=0.2, random_state=42
)

Xc_tr, Xc_te, yc_tr, yc_te = train_test_split(
    X_clf, y_clf, test_size=0.2, random_state=42
)

scaler_r = StandardScaler()
Xr_tr = scaler_r.fit_transform(Xr_tr)
Xr_te = scaler_r.transform(Xr_te)

scaler_c = StandardScaler()
Xc_tr = scaler_c.fit_transform(Xc_tr)
Xc_te = scaler_c.transform(Xc_te)

lr = LinearRegression()
lr.fit(Xr_tr, yr_tr)
yr_pred = lr.predict(Xr_te)

poly = PolynomialFeatures(degree=2)
Xr_poly_tr = poly.fit_transform(Xr_tr)
Xr_poly_te = poly.transform(Xr_te)

pr = LinearRegression()
pr.fit(Xr_poly_tr, yr_tr)
yr_pred_poly = pr.predict(Xr_poly_te)

log_reg = LogisticRegression(max_iter=1000)
log_reg.fit(Xc_tr, yc_tr)
yc_pred_log = log_reg.predict(Xc_te)

knn = KNeighborsClassifier()
knn.fit(Xc_tr, yc_tr)
yc_pred_knn = knn.predict(Xc_te)

dt = DecisionTreeClassifier()
dt.fit(Xc_tr, yc_tr)
yc_pred_dt = dt.predict(Xc_te)

plt.figure()
plt.scatter(yr_te, yr_pred)
plt.plot([yr_te.min(), yr_te.max()], [yr_te.min(), yr_te.max()])
plt.title("Regression: Actual vs Predicted")
plt.xlabel("Actual Marks")
plt.ylabel("Predicted Marks")
plt.show()

plt.figure()
plt.bar(
    ["Linear", "Polynomial"],
    [
        mean_absolute_error(yr_te, yr_pred),
        mean_absolute_error(yr_te, yr_pred_poly)
    ]
)
plt.title("Regression Model Error Comparison")
plt.ylabel("MAE")
plt.show()

plt.figure()
plt.bar(
    ["Logistic", "KNN", "Decision Tree"],
    [
        accuracy_score(yc_te, yc_pred_log),
        accuracy_score(yc_te, yc_pred_knn),
        accuracy_score(yc_te, yc_pred_dt)
    ]
)
plt.title("Classification Accuracy Comparison")
plt.ylabel("Accuracy")
plt.show()

cm = confusion_matrix(yc_te, yc_pred_log)
plt.figure()
plt.imshow(cm)
plt.colorbar()
plt.title("Confusion Matrix – Logistic Regression")
plt.xlabel("Predicted")
plt.ylabel("Actual")
plt.show()

kmeans = KMeans(n_clusters=3, random_state=42)
df["cluster"] = kmeans.fit_predict(X_clf)

plt.figure()
plt.scatter(df["science_marks"], df["maths_marks"], c=df["cluster"])
plt.title("Student Clustering using K-Means")
plt.xlabel("Science Marks")
plt.ylabel("Maths Marks")
plt.show()

print("\n1. Predict Average Marks")
print("2. Predict Performance Level")
choice = int(input("Enter your choice: "))

if choice == 1:
    print("\n1. Linear Regression\n2. Polynomial Regression")
    m = int(input("Choose model: "))

    s = float(input("Science Marks: "))
    mth = float(input("Maths Marks: "))
    att = float(input("Attendance %: "))
    hw = float(input("Homework %: "))
    ct = float(input("Class Tests Attended: "))

    user = pd.DataFrame([[s, mth, att, hw, ct]], columns=reg_features)
    user = scaler_r.transform(user)

    if m == 1:
        print("Predicted Average Marks:", round(lr.predict(user)[0], 2))
    else:
        user = poly.transform(user)
        print("Predicted Average Marks:", round(pr.predict(user)[0], 2))

elif choice == 2:
    print("\n1. Logistic\n2. KNN\n3. Decision Tree")
    m = int(input("Choose model: "))

    s = float(input("Science Marks: "))
    mth = float(input("Maths Marks: "))
    py = float(input("Previous Year Marks: "))
    att = float(input("Attendance %: "))
    hw = float(input("Homework %: "))
    ct = float(input("Class Tests Attended: "))

    user = pd.DataFrame([[s, mth, py, att, hw, ct]], columns=clf_features)
    user = scaler_c.transform(user)

    if m == 1:
        p = log_reg.predict(user)[0]
    elif m == 2:
        p = knn.predict(user)[0]
    else:
        p = dt.predict(user)[0]

    print(
        "Predicted Performance:",
        "Good" if p == 2 else "Average" if p == 1 else "Weak"
    )

print("\nPROJECT COMPLETED SUCCESSFULLY")
