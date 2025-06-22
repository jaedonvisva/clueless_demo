"""
User Management Service
======================

A REST API service for managing user accounts with authentication and profile management.
Part of the microservices architecture for the main application.

Dependencies:
- Flask 2.3.0
- SQLAlchemy 1.4.0
- bcrypt 4.0.0
- PyJWT 2.8.0
"""

from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
from functools import wraps
import re
import logging

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'

# Mock database - in production this would be SQLAlchemy models
users_db = [
    {
        'id': 1,
        'username': 'admin',
        'email': 'admin@example.com',
        'password': generate_password_hash('admin123'),
        'role': 'admin',
        'created_at': '2024-01-01T00:00:00Z',
        'is_active': True
    }
]

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False
    if not re.search(r'[A-Z]', password):
        return False
    if not re.search(r'[a-z]', password):
        return False
    if not re.search(r'\d', password):
        return False
    return True

def generate_token(user_id):
    """Generate JWT token for user authentication"""
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def token_required(f):
    """Decorator to require authentication token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token is invalid'}), 401
        
        return f(current_user_id, *args, **kwargs)
    
    return decorated

@app.route('/api/register', methods=['POST'])
def register():
    """Register a new user account"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    
    # Validation
    if not username or len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    
    if not email or not validate_email(email):
        return jsonify({'error': 'Invalid email format'}), 400
    
    if not password or not validate_password(password):
        return jsonify({'error': 'Password must be at least 8 characters with uppercase, lowercase, and number'}), 400
    
    # Check if user already exists
    for user in users_db:
        if user['username'] == username:
            return jsonify({'error': 'Username already exists'}), 409
        if user['email'] == email:
            return jsonify({'error': 'Email already registered'}), 409
    
    # Create new user
    new_user = {
        'id': len(users_db) + 1,
        'username': username,
        'email': email,
        'password': generate_password_hash(password),
        'role': 'user',
        'created_at': datetime.datetime.utcnow().isoformat() + 'Z',
        'is_active': True
    }
    
    users_db.append(new_user)
    
    return jsonify({
        'message': 'User registered successfully',
        'user_id': new_user['id']
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password required'}), 400
    
    # Find user
    user = None
    for u in users_db:
        if u['username'] == username:
            user = u
            break
    
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if not user['is_active']:
        return jsonify({'error': 'Account is deactivated'}), 401
    
    token = generate_token(user['id'])
    
    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role']
        }
    }), 200

@app.route('/api/profile', methods=['GET'])
@token_required
def get_profile(current_user_id):
    """Get current user's profile"""
    user = None
    for u in users_db:
        if u['id'] == current_user_id:
            user = u
            break
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user['id'],
        'username': user['username'],
        'email': user['email'],
        'role': user['role'],
        'created_at': user['created_at'],
        'is_active': user['is_active']
    }), 200

@app.route('/api/profile', methods=['PUT'])
@token_required
def update_profile(current_user_id):
    """Update current user's profile"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    user = None
    user_index = None
    for i, u in enumerate(users_db):
        if u['id'] == current_user_id:
            user = u
            user_index = i
            break
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Update allowed fields
    if 'email' in data:
        email = data['email']
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Check if email is already taken by another user
        for u in users_db:
            if u['email'] == email and u['id'] != current_user_id:
                return jsonify({'error': 'Email already registered'}), 409
        
        users_db[user_index]['email'] = email
    
    if 'password' in data:
        password = data['password']
        if not validate_password(password):
            return jsonify({'error': 'Password must be at least 8 characters with uppercase, lowercase, and number'}), 400
        
        users_db[user_index]['password'] = generate_password_hash(password)
    
    return jsonify({'message': 'Profile updated successfully'}), 200

@app.route('/api/users', methods=['GET'])
@token_required
def list_users(current_user_id):
    """List all users (admin only)"""
    # Get current user to check role
    current_user = None
    for u in users_db:
        if u['id'] == current_user_id:
            current_user = u
            break
    
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    # Return user list without passwords
    user_list = []
    for user in users_db:
        user_list.append({
            'id': user['id'],
            'username': user['username'],
            'email': user['email'],
            'role': user['role'],
            'created_at': user['created_at'],
            'is_active': user['is_active']
        })
    
    return jsonify({'users': user_list}), 200

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@token_required
def delete_user(current_user_id, user_id):
    """Delete a user account (admin only)"""
    # Get current user to check role
    current_user = None
    for u in users_db:
        if u['id'] == current_user_id:
            current_user = u
            break
    
    if not current_user or current_user['role'] != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    # Find and remove user
    for i, user in enumerate(users_db):
        if user['id'] == user_id:
            if user['role'] == 'admin':
                return jsonify({'error': 'Cannot delete admin user'}), 400
            del users_db[i]
            return jsonify({'message': 'User deleted successfully'}), 200
    
    return jsonify({'error': 'User not found'}), 404

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logging.error(f"Internal server error: {error}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    app.run(debug=True, host='0.0.0.0', port=5000)
