const request = require('supertest');
const app = require('../server'); // or wherever you export your Express app

describe('User API', () => {
  it('should create a new user', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        name: 'TestUser',
        role: 'operator',
        password: 'testpass'
      });
    expect(res.statusCode).toEqual(201);
    expect(res.body.message).toEqual('User created');
    expect(res.body.user).toHaveProperty('id');
  });

  it('should fail to create user with missing fields', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({
        name: '',
        role: 'operator'
      });
    expect(res.statusCode).toEqual(400);
  });
});
