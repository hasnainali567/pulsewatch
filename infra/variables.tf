variable "aws_region" {
  default = "ap-southeast-1"
}

variable "project_name" {
  default = "pulsewatch"
}

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  default = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "azs" {
  default = ["ap-southeast-1a", "ap-southeast-1b"]
}

variable "instance_type" {
  default = "t3.micro"
}

# Keep at 1 while developing to avoid double EC2 usage. hi
# Bump to 2 only briefly to demo the Auto Scaling Group across both AZs.
variable "asg_min_size" {
  default = 1
}

variable "asg_max_size" {
  default = 2
}

variable "asg_desired_capacity" {
  default = 1
}

# Multi-AZ RDS costs roughly double. Keep false while building,
# flip to true only to demo/screenshot, then destroy or flip back.
variable "rds_multi_az" {
  default = false
}

variable "db_username" {
  default = "pulsewatch_admin"
}

variable "db_password" {
  sensitive = true
}

variable "db_name" {
  default = "pulsewatch"
}
