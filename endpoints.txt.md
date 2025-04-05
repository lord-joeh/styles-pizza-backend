### 1. Authentication & User Management

# Endpoint	                    ##Method ##Description	                ##Authentication    ##Roles        ##Example Request
- /api/v1/users/register        POST	Register a new user	           None	                None	        {name, email, password, phone}
- /api/v1/users/login	        POST	Login user and get JWT token   None	                None	        {email, password}
- /api/v1/users/forgot-password POST	Initiate password reset	       None	                None	        {email}
- /api/v1/users/reset-password	POST	Reset password with token	   None	                None	        {token, newPassword}
- /api/v1/users/profile	        GET	    Get logged-in user's profile   JWT Required         All	        Authorization: Bearer <token>
- /api/v1/users/profile	        PUT	    Update user profile	           JWT Required	        All	        {name, phone}
- /api/v1/users/logout	        POST	Logout user (invalidate token) JWT Required         All          Authorization: Bearer <token>


## 2. Pizza Management
## Endpoint	          Method	   Description	              Authentication       Roles	             Parameters/Body

- /api/v1/pizzas	GET	  Get all pizzas (with filters)	  None	      	       None              ?page=1&limit=10&size=large&minPrice=10
- /api/v1/pizzas/:id GET	 Get single pizza by ID	     None	            	   None                          -
- /api/v1/pizzas	POST	Create new pizza (Admin)	JWT Required	 Admin	             {name, description, price, size, ingredients}
- /api/v1/pizzas/:id PUT	Update pizza (Admin)	   JWT Required	     Admin	                 {name, description, price, ingredients}
- /api/v1/pizzas/:id DELETE	Delete pizza (Admin)	JWT Required	   Admin	              -

## 3. Order Management
## Endpoint	Method	Description	Authentication	Roles	Parameters/Body
 
- /api/v1/orders	POST	Create new order	JWT Required	Customer	  {items, delivery_address, payment_method}
- /api/v1/orders	GET	Get all orders (Admin)	JWT Required	Admin	       ?page=1&limit=20&status=pending
- /api/v1/orders/customer	GET	Get orders for logged-in user	JWT Required	Customer	-
- /api/v1/orders/:id	GET	Get order details	JWT Required	Customer/Admin	-
- /api/v1/orders/:id/status	PUT	Update order status (Admin)	JWT Required	Admin	{status: "delivered"}
- /api/v1/orders/:id/payment	PUT	Update payment status (Admin)	JWT Required	Admin	{payment_status: "paid"}
- / api/v1/orders/:id	DELETE	Cancel order	JWT Required	Customer/Admin	-


## 4. Ingredient Management (Admin Only)
## Endpoint	Method	Description	Authentication	Roles	Parameters/Body

- /api/v1/ingredients	GET	Get all ingredients	None	None	?page=1&limit=20
- /api/v1/ingredients/:id	GET	Get ingredient by ID	None	None	-
- /api/v1/ingredients	POST	Create new ingredient	JWT Required	Admin	{name, description}
- /api/v1/ingredients/:id	PUT	Update ingredient	JWT Required	Admin	{name, description}
- /api/v1/ingredients/:id	DELETE	Delete ingredient (if unused)	JWT Required	Admin	-


## 5. Admin Endpoints
## Endpoint	Method	Description	Authentication	Roles	Parameters/Body

- /api/v1/admin/users	GET	Get all users	JWT Required	Admin	?page=1&limit=20
- /api/v1/admin/users/:id	DELETE	Delete user	JWT Required	Admin	-
- /api/v1/admin/dashboard	GET	Get admin dashboard stats	JWT Required	Admin	-