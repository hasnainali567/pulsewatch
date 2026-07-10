terraform {
  backend "s3" {
    bucket         = "pulsewatch-tfstate-hasnain-1234"
    key            = "pulsewatch/terraform.tfstate"
    region         = "ap-southeast-1"
    dynamodb_table = "pulsewatch-tf-lock"
    encrypt        = true
  }
}
