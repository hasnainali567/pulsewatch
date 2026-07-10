packer {
  required_plugins {
    amazon = {
      version = ">= 1.2.8"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "aws_region" {
  default = "ap-southeast-1"
}

source "amazon-ebs" "pulsewatch" {
  region        = var.aws_region
  instance_type = "t3.micro"
  ssh_username  = "ec2-user"
  ami_name      = "pulsewatch-app-{{timestamp}}"

  source_ami_filter {
    filters = {
      name                = "al2023-ami-*-x86_64"
      virtualization-type = "hvm"
      root-device-type    = "ebs"
    }
    owners      = ["amazon"]
    most_recent = true
  }

  tags = {
    Name        = "pulsewatch-app"
    pulsewatch  = "true"
  }
}

build {
  sources = ["source.amazon-ebs.pulsewatch"]

  # Install Node.js 20
  provisioner "shell" {
    inline = [
      "sudo curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -",
      "sudo dnf install -y nodejs"
    ]
  }

  # Copy the app code onto the instance
  provisioner "file" {
    source      = "../app/index.js"
    destination = "/tmp/index.js"
  }

  provisioner "file" {
    source      = "../app/package.json"
    destination = "/tmp/package.json"
  }

  provisioner "file" {
    source      = "../app/pulsewatch.service"
    destination = "/tmp/pulsewatch.service"
  }

  # Install app into /opt/app, install deps, register systemd service
  provisioner "shell" {
    inline = [
      "sudo mkdir -p /opt/app",
      "sudo mv /tmp/index.js /opt/app/index.js",
      "sudo mv /tmp/package.json /opt/app/package.json",
      "cd /opt/app && sudo npm install --production",
      "sudo mv /tmp/pulsewatch.service /etc/systemd/system/pulsewatch.service",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable pulsewatch"
    ]
  }
}
