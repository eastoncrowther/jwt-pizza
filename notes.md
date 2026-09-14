# Learning notes

## JWT Pizza code study and debugging

As part of `Deliverable ⓵ Development deployment: JWT Pizza`, start up the application and debug through the code until you understand how it works. During the learning process fill out the following required pieces of information in order to demonstrate that you have successfully completed the deliverable.

| User activity                                       | Frontend component | Backend endpoints | Database SQL |
| --------------------------------------------------- | ------------------ | ----------------- | ------------ |
| View home page                                      | Home               | N/A               | N/A          |
| Register new user<br/>(t@jwt.com, pw: test)         | Register           | `POST /api/auth`  | `INSERT INTO user (name, email, password) VALUES (?, ?, ?)` |
| Login new user<br/>(t@jwt.com, pw: test)            | Login              | `PUT /api/auth`   | `SELECT * FROM user WHERE email=?` |
| Order pizza                                         | Menu               | `GET /api/order/menu`<br>`POST /api/order` | `SELECT * FROM menu`<br>`INSERT INTO dinerOrder (dinerId, franchiseId, storeId, date) VALUES (?, ?, ?, now())`<br>`INSERT INTO orderItem (orderId, menuId, description, price) VALUES (?, ?, ?, ?)` |
| Verify pizza                                        | Delivery           | `POST /api/order/verify` | N/A |
| View profile page                                   | DinerDashboard     | `GET /api/order` | `SELECT id, franchiseId, storeId, date FROM dinerOrder WHERE dinerId=?`<br>`SELECT id, menuId, description, price FROM orderItem WHERE orderId=?` |
| View franchise<br/>(as diner)                       | FranchiseDashboard | `GET /api/franchise` | `SELECT id, name FROM franchise WHERE name LIKE ?` |
| Logout                                              | Logout             | `DELETE /api/auth` | `DELETE FROM auth WHERE token=?` |
| View About page                                     | About              | N/A               | N/A          |
| View History page                                   | History            | N/A               | N/A          |
| Login as franchisee<br/>(f@jwt.com, pw: franchisee) | Login              | `PUT /api/auth`   | `SELECT * FROM user WHERE email=?`<br>`SELECT * FROM userRole WHERE userId=?` |
| View franchise<br/>(as franchisee)                  | FranchiseDashboard | `GET /api/franchise/{userId}` | `SELECT objectId FROM userRole WHERE role='franchisee' AND userId=?`<br>`SELECT id, name FROM franchise WHERE id in (...)`<br>`SELECT u.id, u.name, u.email FROM userRole AS ur JOIN user AS u ...`<br>`SELECT s.id, s.name, COALESCE(SUM(oi.price), 0) ...` |
| Create a store                                      | CreateStore        | `POST /api/franchise/{franchiseId}/store` | `INSERT INTO store (franchiseId, name) VALUES (?, ?)` |
| Close a store                                       | CloseStore         | `DELETE /api/franchise/{franchiseId}/store/{storeId}` | `DELETE FROM store WHERE franchiseId=? AND id=?` |
| Login as admin<br/>(a@jwt.com, pw: admin)           | Login              | `PUT /api/auth`   | `SELECT * FROM user WHERE email=?`<br>`SELECT * FROM userRole WHERE userId=?` |
| View Admin page                                     | AdminDashboard     | `GET /api/franchise` | `SELECT id, name FROM franchise WHERE name LIKE ?` |
| Create a franchise for t@jwt.com                    | CreateFranchise    | `POST /api/franchise` | `INSERT INTO franchise (name) VALUES (?)`<br>`INSERT INTO userRole (userId, role, objectId) VALUES (?, ?, ?)` |
| Close the franchise for t@jwt.com                   | CloseFranchise     | `DELETE /api/franchise/{franchiseId}` | `DELETE FROM store WHERE franchiseId=?`<br>`DELETE FROM userRole WHERE objectId=?`<br>`DELETE FROM franchise WHERE id=?` |
