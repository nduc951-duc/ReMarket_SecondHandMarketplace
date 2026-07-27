# Tài khoản demo

Các email seed mặc định:

| Vai trò | Email | Ghi chú |
| --- | --- | --- |
| Admin | admin@test.com | Chỉ đọc khi `DEMO_READ_ONLY_ADMIN=true` |
| Agent | agent@test.com | Hỗ trợ khách hàng |
| Người bán | seller@test.com | Có tin đăng mẫu |
| Người mua | buyer@test.com | Kiểm thử luồng mua |
| Mua và bán | both@test.com | Kiểm thử dual-role |

Password không nằm trong source. Cấu hình `DEMO_ADMIN_PASSWORD`,
`DEMO_AGENT_PASSWORD` và `DEMO_CUSTOMER_PASSWORD` bằng deployment secret trước
khi chạy `npm run seed:users`.
