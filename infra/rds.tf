resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${var.project_name}-db-subnet-group" }
}

resource "aws_db_instance" "main" {
  identifier             = "${var.project_name}-db"
  engine                 = "postgres"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  storage_type           = "gp2"
  db_name                = var.db_name
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  multi_az               = var.rds_multi_az
  storage_encrypted      = true
  kms_key_id             = aws_kms_key.rds.arn
  skip_final_snapshot    = true
  publicly_accessible    = false
}
